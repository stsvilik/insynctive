import {COMMANDS} from './constants';
import Device from './Device';
import Bridge, {DeviceStatusObject} from './Bridge';
import EventEmitter from 'events';
import isValidIP from './util/isValidIP';
import log4js from 'log4js';

const {LOG_LEVEL} = process.env;
const RX_BRIDGE_INFO = /Version: ([A-Z0-9]+), MAC: ([a-f0-9:]+)/;
const logger = log4js.getLogger('Global');
logger.level = LOG_LEVEL || 'off';

export interface BridgeInfo {
  version: string;
  mac: string;
  host: string;
}

export default class Insynctive extends EventEmitter {
  readonly host: string;
  private readonly devices: Map<number, Device>;
  private readonly bridge: Bridge;

  constructor(host: string) {
    super();

    if (!isValidIP(host)) {
      throw new Error(`Invalid host IP specified (${host})`);
    }

    this.host = host;
    this.devices = new Map();
    this.bridge = new Bridge(host);
  }

  connect() {
    return this.bridge.connect().then(async () => {
      await this.getDevices(true);

      this.bridge.on(Bridge.events.DEVICE_STATUS_CHANGE, event =>
        this.#handleDeviceStatusChange(event)
      );
    });
  }

  disconnect() {
    return this.bridge.disconnect().then(() => {
      this.devices.clear();
    });
  }

  async getInfo(): Promise<BridgeInfo> {
    const response =
      (await this.bridge.sendCommand(COMMANDS.BRIDGE_INFO)) || '';
    const [, version, mac] = RX_BRIDGE_INFO.exec(response) || [];

    return {version, mac, host: this.host};
  }

  async getDeviceCount() {
    const response =
      (await this.bridge.sendCommand(COMMANDS.DEVICE_COUNT)) || '';
    const [count = '0'] = response.match(/\d+/) || [];

    return parseInt(count, 10);
  }

  async getDevices(forceRefresh = false) {
    if (!this.devices.size || forceRefresh) {
      const devicesCount = await this.getDeviceCount();
      this.devices.clear();

      for (let i = 1; i <= devicesCount; i++) {
        this.devices.set(i, new Device(i, this.bridge));
      }
    }

    return this.devices;
  }

  getDeviceById(id: number): Device | undefined {
    return this.devices.get(id);
  }

  async setStaticIp(ipAddress: string) {
    if (!isValidIP(ipAddress)) {
      logger.error(`Invalid IP address specified: ${ipAddress}`);
      return;
    }

    return await this.bridge.sendCommand(
      `${COMMANDS.SET_STATIC_IP}${ipAddress}`
    );
  }

  #handleDeviceStatusChange({deviceId, status}: DeviceStatusObject) {
    const device = this.getDeviceById(deviceId);

    if (device && status !== device.statusCode) {
      device.setStatusCode(status);

      logger.info(
        `Status change event: {id: ${device.deviceId}, status: ${device.status}}`
      );

      this.emit('onDeviceStatusChange', {device});
    }
  }
}
