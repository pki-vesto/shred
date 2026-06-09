FROM node:22-alpine

# better-sqlite3 ships native bindings; alpine needs build deps for npm install,
# then we drop them to keep the image small.
RUN apk add --no-cache python3 make g++ \
 && mkdir -p /app /data \
 && chown -R node:node /app /data

WORKDIR /app
COPY --chown=node:node package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
 && apk del python3 make g++ \
 && rm -rf /root/.npm /tmp/* /var/cache/apk/*

COPY --chown=node:node . .

USER node
ENV NODE_ENV=production
ENV PORT=8089
EXPOSE 8089

CMD ["node", "server.js"]
