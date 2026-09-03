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
# Джарвис — dev-only тьютор (см. JARVIS_ENABLED в src/config.js). Задавать
# ТОЛЬКО в dev-окружении: без переменной флаг false и карточка не попадает
# даже в бандл.
ARG NEXT_PUBLIC_ENABLE_JARVIS
ENV NEXT_PUBLIC_ENABLE_JARVIS=${NEXT_PUBLIC_ENABLE_JARVIS}
# Google Sign-In (см. src/lib/googleAuth.js). Пусто → кнопка входа остаётся
# неактивной заглушкой, ничего не падает — но если переменная задана в GitLab
# CI и не доезжает досюда, именно так это и выглядит: настроено, а не работает.
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# .sql миграции читаются через fs.readdirSync (src/lib/migrate.js), не через
# import — трассировщик standalone-сборки их не видит и не копирует сам.
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/migrations ./src/lib/migrations
# Тексты книг: вне public (их отдаёт авторизованный роут /api/books), поэтому
# в standalone-сборку сами не попадают — как и миграции строкой выше.
COPY --from=builder --chown=nextjs:nodejs /app/data/books ./data/books

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
