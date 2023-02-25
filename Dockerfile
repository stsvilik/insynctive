FROM node:18

WORKDIR /var/pella/insynctive

COPY package* ./

RUN npm ci --omit=dev --ignore-scripts
RUN npm i express

COPY lib ./lib
COPY preview ./preview

CMD node preview/server.js
