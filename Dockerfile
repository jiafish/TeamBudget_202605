FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

# uploads/ is mounted as a volume at runtime for receipt persistence
VOLUME ["/app/uploads"]

CMD ["npm", "start"]
