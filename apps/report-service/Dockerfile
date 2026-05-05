FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json nest-cli.json ./
RUN npm ci
COPY apps ./apps
COPY libs ./libs
RUN npm run build:report-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
EXPOSE 3003
CMD ["node", "dist/apps/report-service/apps/report-service/src/main.js"]
