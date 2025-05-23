FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create a next.config.js with output: 'standalone'
RUN if ! grep -q "output: 'standalone'" next.config.js; then \
      echo "/** @type {import('next').NextConfig} */" > next.config.js.new && \
      echo "const nextConfig = {" >> next.config.js.new && \
      echo "  output: 'standalone'," >> next.config.js.new && \
      if [ -f next.config.js ]; then \
        sed -n '/^const/,/^};/p' next.config.js | grep -v "^const\|^};" >> next.config.js.new; \
      else \
        echo "  reactStrictMode: true," >> next.config.js.new; \
      fi && \
      echo "};" >> next.config.js.new && \
      echo "module.exports = nextConfig;" >> next.config.js.new && \
      mv next.config.js.new next.config.js; \
    fi

# Build the Next.js application
RUN NEXT_TELEMETRY_DISABLED=1 npm run build -- --no-lint

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Set the user to node
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

USER nextjs

# Expose port
EXPOSE 80

ENV PORT=80
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]