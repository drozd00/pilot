FROM docker.io/library/node:26.13.1-bookworm-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY vendor vendor
RUN npm ci --ignore-scripts
COPY app app
COPY server server
COPY nuxt.config.ts tsconfig.json ./
RUN npm run build

FROM docker.io/library/node:26.13.1-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /workspace/.output ./
USER node
EXPOSE 3000
CMD ["node", "server/index.mjs"]
