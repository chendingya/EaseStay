FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY admin/package*.json ./admin/
RUN npm install --prefix ./admin

COPY admin ./admin

ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}

RUN npm run build --prefix admin

FROM nginx:1.27-alpine

COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin/dist /usr/share/nginx/html

EXPOSE 80
