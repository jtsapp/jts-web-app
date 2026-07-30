# Self-host сборка Next.js (аналог official Next.js Docker example), под
# `output: 'standalone'` из next.config.mjs — в финальный образ попадает
# только сервер + реально используемые node_modules, не весь node_modules.
#
# Секреты (ANTHROPIC_API_KEY, DATABASE_URL, LIVEKIT_*, ...) сюда НЕ зашиты —
# читаются в рантайме через environment (compose-app.yaml), как у backend.
# NEXT_PUBLIC_* — исключение: Next вшивает их в клиентский бандл на этапе
# `next build`, поэтому им нужен ARG/ENV именно на build-стадии (см. ниже).

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --force

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* уходят в браузерный бандл на этапе сборки — должны быть
# доступны здесь, а не только в рантайм-environment контейнера.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
