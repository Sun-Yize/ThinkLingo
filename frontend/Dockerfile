# Stage 1: Build React app
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG PUBLIC_URL=/
ARG REACT_APP_AUTH_TOKEN=
ENV PUBLIC_URL=$PUBLIC_URL
ENV REACT_APP_AUTH_TOKEN=$REACT_APP_AUTH_TOKEN
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built static files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy frontend nginx config
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
