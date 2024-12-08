# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM imbios/bun-node:1.1.38-22-slim
WORKDIR /app

COPY drizzle.config.ts .
COPY drizzle ./drizzle

RUN bun install -g drizzle-kit drizzle-orm postgres

CMD ["drizzle-kit", "migrate"]