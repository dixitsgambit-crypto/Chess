# Chessverse Academy — production image (Linux).
# STATUS: written but not yet built or run (no Docker/WSL on the development machine).
#
#   docker build -t chessverse .
#   docker run -p 8787:8787 -v chessverse-data:/app/data \
#     -e COOKIE_SECURE=1 -e TRUST_PROXY=1 -e SOURCE_URL=https://example.org/your-repo chessverse
#
# The /app/data volume holds the SQLite database and its backups. It must be persistent.

# ---- build: install everything, type-check, build the site
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime: production dependencies, server sources, built site
FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=8787 CHESSVERSE_DB=/app/data/chessverse.db
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
# the server runs TypeScript directly (Node type stripping) and imports shared code from src/
COPY server ./server
COPY src ./src
COPY --from=build /app/dist ./dist
COPY LICENSE THIRD_PARTY_NOTICES.md ./
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME ["/app/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Hosted disks (e.g. Render) are often mounted owned by root. Start as root only to hand the data
# folder to the unprivileged "node" user, then run the server as "node" (setpriv is part of Debian).
CMD ["sh", "-c", "chown -R node:node /app/data && exec setpriv --reuid=node --regid=node --init-groups node --experimental-strip-types server/index.ts --production"]
