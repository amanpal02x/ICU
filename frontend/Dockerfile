# Stage 1: Build the frontend
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Nginx server
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY default.conf.template /etc/nginx/conf.d/default.conf.template

EXPOSE 8080

CMD ["sh", "-c", "envsubst '$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]