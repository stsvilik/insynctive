import { COMMANDS } from "./constants";
import Device from "./Device";
import Bridge from "./Bridge";
import EventEmitter from "events";
import isValidIP from "./util/isValidIP";

const RX_BRIDGE_INFO = /Version: ([A-Z0-9]+), MAC: ([a-f0-9:]+)/;

/**
 * @class Insynctive
 * @extends EventEmitter
 */
export default class Insynctive extends EventEmitter {
    /**
     * @constructor
     * @param {string} host
     */
    constructor(host = "") {
        super();

        if (!isValidIP(host)) {
            throw new Error(`Invalid host IP specified (${ host })`);
        }

        /**
         * @type {Device[]}
         * @private
         */
        this._devices = [];
        this._client = new Bridge(host);
    }

    /**
     * @return {Promise<void>}
     */
    connect() {
        return this._client.connect().then(async () => {
            await this.getDevices(true);

            this._client.on("deviceStatusChange", (event) => this._handleDeviceStatusChange(event));
        });
    }

    /**
     * @return {Promise<void>}
     */
    disconnect() {
        return this._client.disconnect().then(() => {
            this._devices.length = 0;
        });
    }

    /**
     * @return {Promise<{version: string, mac: string}>}
     */
    async getInfo() {
        const response = await this._client.sendCommand(COMMANDS.BRIDGE_INFO);
        const [, version, mac] = RX_BRIDGE_INFO.exec(response);

        return { version, mac };
    }

    /**
     * @return {Promise<number>}
     */
    async getDeviceCount() {
        const response = await this._client.sendCommand(COMMANDS.DEVICE_COUNT) || "";
        const [count] = response.match(/\d+/);

        return parseInt(count, 10);
    }

    /**
     * @return {Promise<Device[]>}
     */
    async getDevices(forceRefresh = false) {
        if (!this._devices.length || forceRefresh) {
            const devicesCount = await this.getDeviceCount();
            this._devices.length = 0;

            for (let i = 1; i <= devicesCount; i++) {
                this._devices.push(new Device(i, this._client));
            }
        }

        return this._devices;
    }

    /**
     * @param {number} id
     * @return {?Device}
     */
    getDeviceById(id) {
        return this._devices.find((device) => device.id === id);
    }

    /***
     * @param {number} deviceId
     * @param {string} status
     * @private
     */
    _handleDeviceStatusChange({ deviceId, status }) {
        const device = this.getDeviceById(deviceId);

        if (device) {
            device.setStatusCode(status);

            this.emit("onDeviceStatusChange", { device });
        }
    }
}
