FROM node:22

WORKDIR /var/pella/insynctive

COPY package* ./

RUN npm ci --omit=dev --ignore-scripts
RUN npm i express mqtt

COPY lib ./lib
COPY preview ./preview

# Defaults to the REST demo; override the command to run the MQTT/HA bridge
# instead, e.g. `docker run <image> node preview/ha-bridge.js`.
CMD ["node", "preview/server.js"]
