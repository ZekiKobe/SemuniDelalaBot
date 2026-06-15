FROM node:20-alpine

RUN apk add --no-cache vips-dev

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

RUN mkdir -p uploads logs

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "src/server.js"]
