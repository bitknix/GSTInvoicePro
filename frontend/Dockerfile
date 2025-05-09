FROM node:18-alpine AS builder

WORKDIR /app

# Add package files first for better caching
COPY package.json package-lock.json* ./

# Use clean install for production builds
RUN npm ci --production=false

# Add source files
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Copy necessary files from builder
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create a non-root user and switch to it
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

# Expose the port
EXPOSE 3000

# Set the command to start the app
CMD ["npm", "start"] 