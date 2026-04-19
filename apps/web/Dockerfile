FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace config
COPY package*.json ./
COPY turbo.json ./

# Copy packages
COPY packages ./packages

# Copy Web app
COPY apps/web ./apps/web

# Install dependencies
RUN npm install --legacy-peer-deps

# Build the web app
RUN npx turbo build --filter=web

FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
