FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ vips-dev
COPY package*.json ./
COPY tsconfig*.json nest-cli.json ./
RUN npm ci
COPY apps ./apps
COPY libs ./libs
RUN npm run build:processing-service

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# poppler-utils provides pdftoppm/pdftocairo used by pdf2pic to rasterize PDFs.
# vips runtime is required by sharp for image processing.
RUN apk add --no-cache poppler-utils graphicsmagick ghostscript vips
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/uploads
EXPOSE 3002
CMD ["node", "dist/apps/processing-service/apps/processing-service/src/main.js"]
