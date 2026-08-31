# Stage 1: Build the Vite React app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
ENV PUPPETEER_SKIP_DOWNLOAD="true"
RUN npm install

COPY . .
RUN echo "Cache bust 8" && npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
