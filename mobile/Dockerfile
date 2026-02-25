FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
COPY mobile/package*.json ./mobile/
RUN npm install --prefix ./mobile

COPY mobile ./mobile

ARG TARO_APP_API_BASE
ENV TARO_APP_API_BASE=${TARO_APP_API_BASE}

RUN npm run build:h5 --prefix mobile

FROM nginx:1.27-alpine

COPY mobile/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/mobile/dist /usr/share/nginx/html

EXPOSE 80
