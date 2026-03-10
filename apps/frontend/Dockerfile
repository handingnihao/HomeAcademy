FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/frontend --workspace=packages/shared
COPY apps/frontend ./apps/frontend
COPY packages/shared ./packages/shared
RUN npm run build --workspace=apps/frontend

FROM nginx:alpine AS runner
# Copy custom nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
