# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS build
COPY . .

# Install dependencies
RUN bun install --frozen-lockfile

# Build the app
RUN bun run build

FROM base AS release
COPY --from=build /app/dist /app

# Run the app
USER bun
CMD ["bun", "index.js"]