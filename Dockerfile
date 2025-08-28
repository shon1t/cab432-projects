# Dockerfile for an Express.js application

FROM node:lts-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

RUN apk add --no-cache ffmpeg

EXPOSE 3000

CMD [ "node", "server.js" ]


