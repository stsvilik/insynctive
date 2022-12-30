import padLeading from './util/padLeading';
import {
  COMMANDS,
  DEVICE_TYPE_NAMES,
  DEVICE_TYPES,
  DOOR_WINDOW_STATE,
  GARAGE_DOOR_STATE,
  DOOR_TEMPER_CODES,
  DeviceType,
  DeviceStatus,
} from './constants';
import type Bridge from './Bridge';

const PAD_MAX = 3;
const RX_HEX = /[a-fA-F0-9]+/;

export default class Device {
  id: number;
  deviceId: string;
  private bridge: Bridge;
  typeCode?: string;
  deviceType?: DeviceType;
  serialNumber?: string;
  statusCode?: string;
  status?: string;
  temper?: boolean;

  constructor(id: number, bridge: Bridge) {
    this.id = id;
    this.deviceId = padLeading(PAD_MAX, id);
    this.bridge = bridge;
  }

  async getTypeCode() {
    this.typeCode = this.typeCode || (await this.#getDeviceType());

    return this.typeCode;
  }

  async getDeviceType() {
    const typeCode = await this.getTypeCode();

    this.deviceType =
      this.deviceType || DEVICE_TYPE_NAMES[typeCode] || 'Unknown';

    return this.deviceType;
  }

  async getStatusCode() {
    this.statusCode = this.statusCode || (await this.#getDeviceStatus());

    return this.statusCode;
  }

  getTemperState() {
    return this.typeCode && DOOR_TEMPER_CODES.has(this.typeCode);
  }

  setStatusCode(statusCode: string) {
    this.statusCode = statusCode;

    this.status = this.#toDeviceStatus(this.typeCode, statusCode);
    this.temper = DOOR_TEMPER_CODES.has(this.typeCode || '');
  }

  async getStatus() {
    const statusCode = await this.getStatusCode();
    const typeCode = await this.getTypeCode();

    return this.#toDeviceStatus(typeCode, statusCode);
  }

  async getBattery() {
    const batteryStatus = (await this.#getDeviceBatteryStatus()) || '';

    return parseInt(batteryStatus, 16);
  }

  /**
   * @return {Promise<string|null>}
   */
  async getSerialNumber() {
    this.serialNumber =
      this.serialNumber || (await this.#getDeviceSerialNumber());

    return this.serialNumber;
  }

  /**
   * @return {Promise<{id: number, battery: number, type: (*|string), status: (*|string|null), serialNo: (string|null)}>}
   */
  async toJSON() {
    const [battery, type, serialNumber, status] = await Promise.all([
      this.getBattery(),
      this.getDeviceType(),
      this.getSerialNumber(),
      this.getStatus(),
    ]);

    return {
      battery,
      id: this.id,
      serialNumber,
      status,
      type,
      temper: this.getTemperState(),
    };
  }

  async #getDeviceType() {
    const response =
      (await this.bridge.sendCommand(
        `${COMMANDS.DEVICE_INFO}${this.deviceId}`
      )) || '';
    const [status = ''] = response.match(RX_HEX) || [];

    return status;
  }

  async #getDeviceStatus() {
    const response =
      (await this.bridge.sendCommand(
        `${COMMANDS.DEVICE_STATUS}${this.deviceId}`
      )) || '';
    const [status] = response.match(RX_HEX) || [];

    return status;
  }

  async #getDeviceBatteryStatus() {
    const response =
      (await this.bridge.sendCommand(
        `${COMMANDS.BATTERY_STATUS}${this.deviceId}`
      )) || '';
    const [percentage] = response.match(RX_HEX) || [];

    return percentage;
  }

  async #getDeviceSerialNumber() {
    const response =
      (await this.bridge.sendCommand(
        `${COMMANDS.DEVICE_ID}${this.deviceId}`
      )) || '';
    const [serialNumber] = response.match(RX_HEX) || [];

    return serialNumber;
  }

  #toDeviceStatus(typeCode = '', statusCode = ''): DeviceStatus {
    switch (typeCode) {
      case DEVICE_TYPES.GARAGE_DOOR:
        switch (true) {
          case GARAGE_DOOR_STATE.LOCKED.has(statusCode):
            return 'Locked';
          case GARAGE_DOOR_STATE.UNLOCKED.has(statusCode):
            return 'Unlocked';
          default:
            return 'Unknown';
        }
      case DEVICE_TYPES.BLIND:
        return 'Unknown';
      default:
        switch (true) {
          case DOOR_WINDOW_STATE.CLOSED.has(statusCode):
            return 'Closed';
          case DOOR_WINDOW_STATE.OPEN.has(statusCode):
            return 'Open';
          default:
            return 'Unknown';
        }
    }
  }
}
