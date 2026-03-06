# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy source
COPY src ./src

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "src/index.js"]