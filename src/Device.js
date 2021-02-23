import padLeading from "./util/padLeading";
import { COMMANDS, DEVICE_TYPE_NAMES, DEVICE_TYPES, DOOR_WINDOW_STATE, GARAGE_DOOR_STATE } from "./constants";

const PAD_MAX = 3;
const RX_HEX = /[a-fA-F0-9]+/;

export default class Device {
    /**
     * @param {number} id
     * @param {Bridge} bridge
     */
    constructor(id, bridge) {
        this.id = id;
        this._deviceId = padLeading(PAD_MAX, id);
        this._bridge = bridge;
        this._type = null;
        this._serialNo = null;
        this._status = null;
    }

    /**
     * @return {Promise<null|string>}
     */
    async getTypeCode() {
        this._type = this._type || await this._getDeviceType();

        return this._type;
    }

    /**
     * @return {Promise<null|string>}
     */
    async getStatusCode() {
        this._status = this._status || await this._getDeviceStatus();

        return this._status;
    }

    /**
     * @return {Promise<*|string>}
     */
    async getType() {
        const typeCode = await this.getTypeCode();

        return DEVICE_TYPE_NAMES[typeCode] || "Unknown";
    }

    /**
     * @param {string} status
     */
    setStatusCode(status) {
        this._status = status;
    }

    /**
     * @return {Promise<*|string|null>}
     */
    async getStatus() {
        const statusCode = await this.getStatusCode();
        const typeCode = await this.getTypeCode();

        return this._statusToString(typeCode, statusCode);
    }

    /**
     * @return {Promise<number>}
     */
    async getBattery() {
        const batteryStatus = await this._getDeviceBatteryStatus();

        return parseInt(batteryStatus, 16);
    }

    /**
     * @return {Promise<string|null>}
     */
    async getSerialNo() {
        this._serialNo = this._serialNo || await this._getDeviceSerialNumber();

        return this._serialNo;
    }

    /**
     * @return {Promise<{id: number, battery: number, type: (*|string), status: (*|string|null), serialNo: (string|null)}>}
     */
    async toJSON() {
        return ({
            battery: await this.getBattery(),
            id: this.id,
            serialNo: await this.getSerialNo(),
            status: await this.getStatus(),
            type: await this.getType()
        });
    }

    /**
     * @return {Promise<string>} Hex type designation code
     * @private
     */
    async _getDeviceType() {
        const response = await this._bridge.sendCommand(`${ COMMANDS.DEVICE_INFO }${ this._deviceId }`) || "";
        const [status] = response.match(RX_HEX);

        return status;
    }

    /**
     * @return {Promise<string>} Hex status code
     * @private
     */
    async _getDeviceStatus() {
        const response = await this._bridge.sendCommand(`${ COMMANDS.DEVICE_STATUS }${ this._deviceId }`) || "";
        const [status] = response.match(RX_HEX);

        return status;
    }

    /**
     * @return {Promise<string>} Hex battery status code
     * @private
     */
    async _getDeviceBatteryStatus() {
        const response = await this._bridge.sendCommand(`${ COMMANDS.BATTERY_STATUS }${ this._deviceId }`) || "";
        const [percentage] = response.match(RX_HEX);

        return percentage;
    }

    /**
     * @return {Promise<string>} Hex serial number
     * @private
     */
    async _getDeviceSerialNumber() {
        const response = await this._bridge.sendCommand(`${ COMMANDS.DEVICE_ID }${ this._deviceId }`) || "";
        const [serialNumber] = response.match(RX_HEX);

        return serialNumber;
    }

    /**
     * @param {string} typeCode
     * @param {string} statusCode
     * @return {string|*}
     * @private
     */
    _statusToString(typeCode, statusCode) {
        switch (typeCode) {
        case DEVICE_TYPES.GARAGE_DOOR:
            switch (true) {
            case GARAGE_DOOR_STATE.LOCKED.has(statusCode):
                return "Locked";
            case GARAGE_DOOR_STATE.UNLOCKED.has(statusCode):
                return "Unlocked";
            default:
                return "Unknown";
            }
        case DEVICE_TYPES.BLIND:
            return statusCode;
        default:
            switch (true) {
            case DOOR_WINDOW_STATE.CLOSED.has(statusCode):
                return "Closed";
            case DOOR_WINDOW_STATE.OPEN.has(statusCode):
                return "Open";
            default:
                return "Unknown";
            }
        }
    }
}
