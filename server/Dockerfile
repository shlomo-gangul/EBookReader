FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install build tools for native addons (better-sqlite3), then clean up
RUN apk add --no-cache python3 make g++ && \
    npm ci --only=production && \
    apk del python3 make g++

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 4000

# Start server
CMD ["node", "dist/index.js"]
