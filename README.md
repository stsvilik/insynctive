# Insynctive

Pella&reg; Insynctive&trade; Gateway over Network interface

## Description

This repository is designed to work with Pella&reg; Insynctive&trade; Bridge connected to your LAN
(it will NOT work if Bridge is in Z-Wave pair mode). By default, your bridge will obtain dynamic IP address via DHCP. If
you wish to assign a fixed IP address to your bridge, you may do so via Telnet interface. For more information refer to
this guide [here](https://content.pella.com/cs/groups/public/documents/pel_image/mhat/mdq4/~edisp/p-048442.pdf).

This package can be used either as programmatic API (for use in other code), or as a REST API gateway (via CLI
executable).

# Code API

Interfaces provided by this code base can be used to query and observe events exposed by Pella&reg; Insynctive&reg;
Bridge connected to your local LAN.

## Installation

This code is distributed via NPM and can be installed by typing the following command:

```shell
npm install insynctive
```

In your code you may use above module in the following manner:

```javascript
import Insynctive from "insynctive";

const insynctive = new Insynctive("192.168.1.15");

insynctive.on("onDeviceStatusChange", async (device) => {
    const deviceData = await device.toJSON();

    console.log(deviceData);
});

insynctive.connect().then(async () => {
    const bridgeInfo = await insynctive.getInfo();
});
```

## API Interface

- `class Insynctive(host)` - Root level object which represents Pella&reg; Insynctive&trade; Bridge itself.
    - `{string} host` - IP address of your bridge device
    - Methods:
        - `{Promise<void>} connect()` - connects to the bridge device
        - `{Promise<void>} disconnect()` - disconnects from the bridge device
        - `{Promise<{version: string, mac: string}>} getInfo()` - returns bridge details
        - `{Promise<number>} getDeviceCount()` - returns a number of registered devices
        - `{Promise<Device[]>} getDevices([forceRefresh = false])` - returns array of Device objects
            - `{boolean} forceRefresh` - if set to `true`, forces hard refresh of devices connected to the bridge
        - `{?Device} getDeviceById(id)` - returns a Device object if found. This method assumes that call `getDevices()`
          has been already made. This method will return one of the cached known devices.
    - Events:
        - "onDeviceStatusChange" - Will emit when device changes status (ex. from closed to open)
            - `{Device} event` - object passed into event handler represents device on which change has occurred.


- `class Device() (read-only)` - Child level object which represents any device connected to the bridge.
    - Properties:
        - `{string} id` - device sequential id
    - Methods:
        - `{Promise<null|string>} getTypeCode()` - returns raw system-specific device type code
        - `{Promise<null|string>} getStatusCode()` - returns raw device-specific status code
        - `{Promise<*|string>} getType()` - returns human-readable device type
        - `{Promise<*|string|null>} getStatus()` - returns human-readable status state
        - `{Promise<number>} getBattery()` - returns battery level as percent (0-100)
        - `{Promise<string|null>} getSerialNo()` - returns device serial number
        - `{Promise<{Object}> toJSON()` - returns `id`, `battery`, `type`, `status`, `serialNo` as JSON object

### Environment variables

- `INSYNCTIVE_BRIDGE_IP` - IP address of the Pella&reg; Insynctive&trade; Bridge
- `LOG_LEVEL` - log level for debugging. Defaults to "off". Available options are "debug", "error", "warning", "info", "
  fatal".

### Local Development
To test your code run `INSYNCTIVE_BRIDGE_IP=x.x.x.x npm start`, where `x.x.x.x` is the IP of your bridge.
Once your service is running, in your browser type IP of your machine where service is running and specify port `3000`.

Example: `http://localhost:3000`

### REST API

- `/` - returns bridge info as JSON
- `/devices` - returns an array of devices as JSON (slow)
- `/device/:id` - returns device details as JSON

### Disclosures

**Insynctive&trade;** - Is a registered trademark of Pella&reg; corporation. 
