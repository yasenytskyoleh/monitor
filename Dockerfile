FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
  && apt-get install --yes --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

WORKDIR /workspace

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY apps/btc-monitor/package.json apps/btc-monitor/package.json
COPY packages/binance-spot/package.json packages/binance-spot/package.json
COPY packages/candle-evaluation/package.json packages/candle-evaluation/package.json
COPY packages/domain-model/package.json packages/domain-model/package.json
COPY packages/pattern-detection/package.json packages/pattern-detection/package.json
COPY packages/pattern-notification/package.json packages/pattern-notification/package.json

RUN pnpm install --frozen-lockfile

COPY apps/btc-monitor apps/btc-monitor
COPY packages/binance-spot packages/binance-spot
COPY packages/candle-evaluation packages/candle-evaluation
COPY packages/domain-model packages/domain-model
COPY packages/pattern-detection packages/pattern-detection
COPY packages/pattern-notification packages/pattern-notification

RUN pnpm --filter @monitor/btc-monitor build
RUN pnpm --filter @monitor/btc-monitor deploy --legacy --prod /opt/btc-monitor

FROM build AS migrate

USER node

CMD ["node", "packages/domain-model/node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "packages/domain-model/prisma.config.ts"]

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
  && apt-get install --yes --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /opt/btc-monitor/package.json ./package.json
COPY --from=build --chown=node:node /opt/btc-monitor/dist/src ./dist/src
COPY --from=build --chown=node:node /opt/btc-monitor/node_modules ./node_modules

USER node

CMD ["node", "dist/src/index.js"]
