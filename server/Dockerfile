FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl python3 make g++

COPY package*.json ./

RUN npm install --omit=dev

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

RUN mkdir -p uploads

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && node src/index.js"]
