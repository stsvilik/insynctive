const mqtt = require('mqtt');
const {default: Insynctive} = require('../lib');
const log4js = require('log4js');

const {
  INSYNCTIVE_BRIDGE_IP,
  MQTT_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  HA_DISCOVERY_PREFIX = 'homeassistant',
  MQTT_TOPIC_PREFIX = 'insynctive',
} = process.env;

const logger = log4js.getLogger('HaBridge');
logger.level = 'info';

if (!MQTT_URL) {
  logger.fatal('MQTT_URL environment variable is required. Shutting down!');
  throw new Error('MQTT_URL environment variable is required');
}

const insynctive = new Insynctive(INSYNCTIVE_BRIDGE_IP);
const availabilityTopic = `${MQTT_TOPIC_PREFIX}/bridge/availability`;

const mqttClient = mqtt.connect(MQTT_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  will: {topic: availabilityTopic, payload: 'offline', retain: true},
});

// Locked/Unlocked-style devices (garage door + door lock) share the same
// mapping; door/window is Open/Closed; blinds have no reliable status
// decode yet, so they're intentionally left out of this table.
const ENTITY_TYPES = {
  'Pella Door/Window': {
    deviceClass: 'door',
    template: "{{ 'ON' if value_json.status == 'Open' else 'OFF' }}",
  },
  'Pella Garage Door': {
    deviceClass: 'lock',
    template: "{{ 'ON' if value_json.status == 'Unlocked' else 'OFF' }}",
  },
  'Pella Door Lock': {
    deviceClass: 'lock',
    template: "{{ 'ON' if value_json.status == 'Unlocked' else 'OFF' }}",
  },
};

function stateTopic(deviceId) {
  return `${MQTT_TOPIC_PREFIX}/device/${deviceId}/state`;
}

function haDeviceBlock(deviceId, type) {
  return {
    identifiers: [`insynctive_${insynctive.host}_${deviceId}`],
    name: `${type} ${deviceId}`,
    manufacturer: 'Pella',
    model: type,
  };
}

function publish(topic, payload) {
  return new Promise((resolve, reject) => {
    mqttClient.publish(
      topic,
      typeof payload === 'string' ? payload : JSON.stringify(payload),
      {retain: true},
      error => (error ? reject(error) : resolve()),
    );
  });
}

async function publishDiscoveryConfig(deviceId, type) {
  const device = haDeviceBlock(deviceId, type);
  const baseConfig = {
    device,
    availability_topic: availabilityTopic,
    payload_available: 'online',
    payload_not_available: 'offline',
    state_topic: stateTopic(deviceId),
  };

  const entityType = ENTITY_TYPES[type];

  if (entityType) {
    await publish(
      `${HA_DISCOVERY_PREFIX}/binary_sensor/insynctive_${deviceId}/state/config`,
      {
        ...baseConfig,
        name: `${type} ${deviceId}`,
        unique_id: `insynctive_${deviceId}_state`,
        device_class: entityType.deviceClass,
        value_template: entityType.template,
      },
    );
  }

  await publish(
    `${HA_DISCOVERY_PREFIX}/sensor/insynctive_${deviceId}/battery/config`,
    {
      ...baseConfig,
      name: `${type} ${deviceId} Battery`,
      unique_id: `insynctive_${deviceId}_battery`,
      device_class: 'battery',
      unit_of_measurement: '%',
      state_class: 'measurement',
      entity_category: 'diagnostic',
      value_template: '{{ value_json.battery }}',
    },
  );

  await publish(
    `${HA_DISCOVERY_PREFIX}/binary_sensor/insynctive_${deviceId}/tamper/config`,
    {
      ...baseConfig,
      name: `${type} ${deviceId} Tamper`,
      unique_id: `insynctive_${deviceId}_tamper`,
      device_class: 'tamper',
      value_template: "{{ 'ON' if value_json.temper else 'OFF' }}",
    },
  );
}

async function publishState(device) {
  const payload = await device.toJSON();

  await publish(stateTopic(device.id), payload);
}

mqttClient.on('connect', async () => {
  logger.info('Connected to MQTT broker');

  try {
    await publish(availabilityTopic, 'online');
    await insynctive.connect();

    const devices = await insynctive.getDevices();

    for (const device of devices.values()) {
      const {type} = await device.toJSON();

      await publishDiscoveryConfig(device.id, type);
      await publishState(device);
    }

    insynctive.on('onDeviceStatusChange', ({device}) => {
      publishState(device).catch(error =>
        logger.error(`Failed to publish state for device ${device.id}`, error),
      );
    });

    logger.info('HA bridge started');
  } catch (error) {
    logger.fatal('Error starting HA bridge. Shutting down!', error);
    throw error;
  }
});

mqttClient.on('error', error => logger.error('MQTT client error', error));
