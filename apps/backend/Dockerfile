FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/backend --workspace=packages/shared
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared
RUN npm run db:generate --workspace=apps/backend
RUN npm run build --workspace=apps/backend

FROM node:20-alpine AS runner
WORKDIR /app
# Install OpenSSL for Prisma
RUN apk add --no-cache openssl
# Copy node_modules from root workspace location
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/packages/shared ./packages/shared
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
