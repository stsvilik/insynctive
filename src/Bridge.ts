import {Telnet} from 'telnet-client';
import EventEmitter from 'events';
import log4js, {Logger} from 'log4js';

export interface DeviceStatusObject {
  deviceId: number;
  status: string;
}

interface CommandQueueItem {
  cmd: string;
  cb: (value: string) => void;
}

const {LOG_LEVEL = 'off', DEBUG_BRIDGE} = process.env;
const RX_STATUS_CHANGE = /POINTSTATUS-(\d+),\$(\d+)/;
const RX_RESPONSE = /^[\w-,$: ]+$/;
const RX_INVALID_RESPONSE_CHARS = /[^\w[\-,$: \r\n]+/gm;
const RX_NEW_LINE = /\r\n/;
const TELNET_TIMEOUT = 5000;

export default class Bridge extends EventEmitter {
  private logger: Logger;
  private readonly configuration;
  private connected: boolean = false;
  private connection: Telnet;
  private commandQueue: CommandQueueItem[];
  static events = {
    DEVICE_STATUS_CHANGE: 'deviceStatusChange',
  };

  constructor(hostIp: string) {
    super();

    this.commandQueue = [];
    this.connection = new Telnet();
    this.configuration = {
      host: hostIp,
      shellPrompt: null,
      negotiationMandatory: false,
      ors: '\r\n',
      timeout: TELNET_TIMEOUT,
      debug: DEBUG_BRIDGE === 'true',
    };
    this.logger = log4js.getLogger('Bridge');
    this.logger.level = LOG_LEVEL;
  }

  #onClose() {
    this.logger.error('Connection to the bridge was closed!');
    this.connected = false;
  }

  async #enqueue(cmd: string, cb: (value: string) => void) {
    this.logger.debug('Send:', cmd);
    this.commandQueue.push({cmd, cb});
    await this.connection.send(cmd);
  }

  #dequeue(value: string) {
    const commandQueueItem = this.commandQueue.shift();

    commandQueueItem?.cb(value);
    this.logger.info(`Sent: ${commandQueueItem?.cmd}, Received: ${value}`);
  }

  async connect() {
    this.connection.once('close', () => this.#onClose());
    this.connection.on('data', (data: Buffer) => this.#onDataReceive(data));

    try {
      await this.connection.connect(this.configuration);
      this.connected = true;
      this.logger.info(`Connected to the bridge on ${this.configuration.host}`);
    } catch (error) {
      this.logger.error('Failed to connect to the bridge:', error);
    }
  }

  async disconnect() {
    if (!this.connected) return;

    try {
      await this.connection.end();
      this.connected = false;
    } catch (error) {
      this.logger.error('Failure to disconnect from Pella Bridge', error);
    }

    log4js.shutdown();
  }

  async sendCommand(command?: string): Promise<string | undefined> {
    if (!this.connected || !command) return;

    return new Promise(resolve => {
      this.#enqueue(command, value => resolve(value));
    });
  }

  #onDataReceive(data: Buffer) {
    const response = Buffer.from(data)
      .toString()
      .replace(RX_INVALID_RESPONSE_CHARS, '');
    const packets = response
      .split(RX_NEW_LINE)
      .filter(Boolean)
      .map(value => value.trimEnd());

    packets.forEach(value => {
      if (RX_STATUS_CHANGE.test(value)) {
        const [, deviceIdStr, statusStr] = RX_STATUS_CHANGE.exec(value) || [];

        this.emit(Bridge.events.DEVICE_STATUS_CHANGE, {
          deviceId: parseInt(deviceIdStr, 10),
          status: statusStr,
        });

        return;
      }

      if (RX_RESPONSE.test(value)) {
        this.#dequeue(value);
      }
    });

    this.logger.debug('Raw response:', response);
  }
}
