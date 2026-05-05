FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json nest-cli.json ./
RUN npm ci
COPY apps ./apps
COPY libs ./libs
RUN npm run build:api-gateway

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/apps/api-gateway/apps/api-gateway/src/main.js"]
