# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Production Stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy production-ready files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install only production dependencies
RUN npm install --only=production

# Expose the API port (change this to match your backend port if different)
EXPOSE 5000

# Start the application
CMD ["node", "dist/api/index.js"]
