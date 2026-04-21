FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl python3 make g++

# Copy root workspace config
COPY package*.json ./
COPY turbo.json ./

# Copy packages
COPY packages ./packages

# Copy API app
COPY apps/api ./apps/api

# Install dependencies for the whole monorepo but only what's needed for the api
RUN npm install --legacy-peer-deps

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

# Final image
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app /app

WORKDIR /app/apps/api

RUN mkdir -p uploads

EXPOSE 3001

VOLUME /app/apps/api/uploads

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
