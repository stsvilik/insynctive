import Telnet from "telnet-client";
import EventEmitter from "events";
import log4js from "log4js";

const { LOG_LEVEL = "off" } = process.env;
const RX_STATUS_CHANGE = /POINTSTATUS(\d+),\$(\d+)/;

module.exports = class Bridge extends EventEmitter {
    /**
     * @param {string} hostIP
     */
    constructor(hostIP) {
        super();

        this.logger = log4js.getLogger("Bridge");
        this.logger.level = LOG_LEVEL;

        this._connected = false;
        this.connection = new Telnet();

        this.configuration = {
            host: hostIP,
            shellPrompt: "",
            timeout: 5000,
            debug: true
        };
    }

    /**
     * @return {Promise<void>}
     */
    connect() {
        return this.connection.connect(this.configuration).then(response => {
            if (response.indexOf("Insynctive Telnet Server")) {
                this.logger.info(`Connected to bridge at ${ this.configuration.host }`);

                this._connected = true;
                this.connection.addListener("data", (data) => this._handleData(data));
            }
        }).catch(err => {
            this.logger.error(`Error connecting to bridge at ${ this.configuration.host }`, err);
        });
    }

    /**
     * @return {Promise<void>}
     */
    disconnect() {
        return this.connection.end().then(() => {
            this._connected = false;
            log4js.shutdown();
        }).catch(err => {
            this.logger.error(`Error disconnecting from bridge at ${ this.configuration.host }`, err);
            log4js.shutdown();
        });
    }

    /**
     * @param {string} command
     * @return {string|Promise<string>}
     */
    sendCommand(command) {
        if (!this._connected) {
            return "";
        }

        this.logger.debug("Send:", command);
        return this.connection.send(command);
    }

    /**
     * @param {Uint8Array} data
     * @private
     */
    _handleData(data) {
        const stringData = Buffer.from(data).toString().replace(/\W+/m, "");

        if (RX_STATUS_CHANGE.test(stringData)) {
            const [, deviceIdStr, statusStr] = RX_STATUS_CHANGE.exec(stringData);

            this.emit("deviceStatusChange", {
                deviceId: parseInt(deviceIdStr, 10),
                status: statusStr
            });
        }

        this.logger.debug("Recv:", stringData);
    }
};
