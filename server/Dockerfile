FROM node:20-bookworm-slim

WORKDIR /app

COPY server/package*.json ./server/
RUN npm install --omit=dev --prefix ./server

COPY server ./server

EXPOSE 4100

CMD ["npm", "start", "--prefix", "server"]
