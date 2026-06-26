# syntax=docker/dockerfile:1

# Debian slim: sharp ships prebuilt binaries (no Alpine vips/apk DNS issues).
FROM node:20-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
RUN groupadd --gid 1001 delala \
  && useradd --uid 1001 --gid delala --create-home delala

ENV NODE_ENV=production \
  PORT=5000

WORKDIR /app

COPY --from=deps --chown=delala:delala /app/node_modules ./node_modules
COPY --chown=delala:delala package.json package-lock.json ./
COPY --chown=delala:delala src ./src
COPY --chown=delala:delala start-bot.js ./

RUN mkdir -p uploads logs \
  && chown -R delala:delala uploads logs

USER delala

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/v1/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
