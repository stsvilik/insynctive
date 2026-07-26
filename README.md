# Index

Pella&reg; Insynctive&trade; Gateway over Network interface

## Description

This repository is designed to work with Pella&reg; Insynctive&trade; Bridge connected to your LAN
(it will NOT work if Bridge is in Z-Wave pair mode). By default, your bridge will obtain dynamic IP address via DHCP. If
you wish to assign a fixed IP address to your bridge, you may do so via Telnet interface. For more information refer to
this guide [here](https://content.pella.com/cs/groups/public/documents/pel_image/mhat/mdq4/~edisp/p-048442.pdf).

This package can be used either as programmatic API (for use in other code), or as a REST API gateway (via CLI
executable).

# Code API

Interfaces provided by this code base can be used to query and observe events exposed by Pella&reg; Index&reg;
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

insynctive.on("onDeviceStatusChange", async ({ device }) => {
    const deviceData = await device.toJSON();

    console.log(deviceData);
});

insynctive.connect().then(async () => {
    const bridgeInfo = await insynctive.getInfo();
});
```

## API Interface

- `class Insynctive(host)` - Root level object which represents Pella&reg; Index&trade; Bridge itself.
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

- `INSYNCTIVE_BRIDGE_IP` - IP address of the Pella&reg; Index&trade; Bridge
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

### Home Assistant

This repo includes an MQTT bridge (`preview/ha-bridge.js`) that publishes devices to Home Assistant using
[MQTT Discovery](https://www.home-assistant.io/integrations/mqtt/#mqtt-discovery), keyed off the same
`onDeviceStatusChange` event used by the programmatic API above — state updates are pushed in real time, not polled.

This is a **read-only** integration: it reports sensor/lock/battery state to HA, it does not yet support sending
commands (e.g. lock/unlock, open/close garage door) back to the bridge.

Prerequisites: an MQTT broker reachable from wherever this runs (e.g. the Mosquitto add-on if you're running HA OS).

```shell
INSYNCTIVE_BRIDGE_IP=x.x.x.x MQTT_URL=mqtt://localhost:1883 npm run start:ha
```

#### Running via Docker Compose

```shell
npm run compile   # produces lib/, which the image copies in
cp .env.example .env   # then fill in INSYNCTIVE_BRIDGE_IP and MQTT_URL
docker compose up --build
```

This starts the `ha-bridge` service only. The REST demo (`preview/server.js`) is also available as an
optional `rest-api` service, but isn't started by default - `ha-bridge` and `rest-api` would each open
their own telnet connection to the same physical bridge, which its hardware may not support running
concurrently. Start it explicitly if you want it: `docker compose --profile rest up`.

#### Environment variables

- `MQTT_URL` - MQTT broker URL, e.g. `mqtt://localhost:1883` (required)
- `MQTT_USERNAME` / `MQTT_PASSWORD` - MQTT broker credentials (optional)
- `HA_DISCOVERY_PREFIX` - Home Assistant discovery topic prefix. Defaults to `homeassistant`
- `MQTT_TOPIC_PREFIX` - prefix used for this bridge's own state/availability topics. Defaults to `insynctive`

#### Entity mapping

| Device type | HA entity | device_class |
|---|---|---|
| Pella Door/Window | `binary_sensor` | `door` |
| Pella Garage Door | `binary_sensor` | `door` |
| Pella Door Lock | `binary_sensor` | `lock` |
| Pella Blind | *(not exposed - see limitations below)* | - |
| All types | `sensor` (battery %) | `battery` |
| All types | `binary_sensor` (tamper) | `tamper` |

Status-code decoding for Garage Door and Door Lock was revised based on comparison against an independent,
production-used implementation ([johnsonej23/pella_insynctive](https://github.com/johnsonej23/pella_insynctive) -
a Home Assistant custom integration for the same bridge). Garage Door is now decoded as a plain open/closed
contact rather than Locked/Unlocked, and Door Lock uses its own dedicated, narrower status-code set instead of
sharing Garage Door's. Neither of these device types is represented in this repo's own test hardware (only
Door/Window and Door Lock are), so **Garage Door decoding in particular is unverified against real hardware** -
if you have one and see wrong behavior, please open an issue.

#### Known limitations

- **Blinds report no usable status.** The underlying protocol decoding for blind position isn't implemented, so
  blinds are only exposed via their battery/tamper entities, not a state entity. The referenced
  [johnsonej23/pella_insynctive](https://github.com/johnsonej23/pella_insynctive) project decodes it as a 0-100
  position value (inverted) and exposes it as a `cover` entity with open/close/set-position support - a reasonable
  starting point if this gets implemented here later.
- **Mid-session bridge drops aren't reflected in HA's availability.** The bridge-offline (`will`) message only fires
  if the whole Node process dies. If just the telnet connection to the physical Pella bridge drops (and later
  reconnects), HA won't show the device as unavailable during that window, since `Bridge`/`Insynctive` don't yet
  expose a public event for that transition.
- **No control support.** Lock/unlock and garage door commands aren't implemented (see above).

### Disclosures

**Insynctive&trade;** - Is a registered trademark of Pella&reg; corporation. 
