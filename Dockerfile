# ---------- BUILD ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Dùng npm ci sẽ nhanh và ổn định hơn npm install cho môi trường CI/Docker
RUN npm install --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- PRODUCTION ----------
FROM node:20-alpine
WORKDIR /app

# Chỉ copy những thứ thực sự cần để chạy
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Chỉ lấy node_modules đã được lọc (không có devDeps)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/main.js"]