const express = require("express");
const app = express();
const port = 3000;
const Insynctive = require("../");
const log4js = require("log4js");

const { INSYNCTIVE_BRIDGE_IP, LOG_LEVEL } = process.env;
const insynctive = new Insynctive(INSYNCTIVE_BRIDGE_IP);

const logger = log4js.getLogger("Server");
logger.level = LOG_LEVEL || "off";

app.get("/", async (req, res) => {
    res.send(await insynctive.getInfo());
});

app.get("/devices", async (req, res) => {
    try {
        const devicesArray = await insynctive.getDevices();
        const devices = await Promise.all(devicesArray.map(async device => await device.toJSON()));

        res.send(devices);
    }
    catch (error) {
        res.status(500).send({ error: `Error retrieving devices` });
        logger.error("GET: /devices", error);
    }
});

app.get("/devices/:id", async (req, res) => {
    const deviceId = parseInt(req.params.id);
    const device = insynctive.getDeviceById(deviceId);

    if (!device) {
        res.status(404).send({ error: `Device with id ${ deviceId } not found` });
        logger.warn(`GET: /device/${ deviceId }`, "Not found");
        return;
    }

    try {
        const deviceJson = await device.toJSON();
        res.send(deviceJson);
    }
    catch (error) {
        res.status(500).send({ error: `Error retrieving device with id ${ deviceId }` });
        logger.error(`GET: /device/${ deviceId }`, error);
    }
});

app.listen(port, async () => {
    try {
        await insynctive.connect();
    }
    catch (err) {
        logger.fatal("Error connecting to Bridge. Shutting down!", err);
        process.exit(-1);
    }

    logger.info("Server started");
});
