#!/usr/bin/env bash
# Открыть сайт (jts-web-app) сразу на нескольких доменах.
#
# В коде домена нет: API берётся из NEXT_PUBLIC_API_URL, ссылки относительные,
# «поделиться приложением» и origin для YouTube читаются из window.location.
# Бэкенд тоже не мешает — CorsConfig стоит на allowedOriginPatterns("*").
# Поэтому вся работа здесь: nginx (server_name), сертификат на все имена и
# Google Sign-In (его список origin'ов правится руками, см. КОНЕЦ файла).
#
# Запускать НА СЕРВЕРЕ, под root. Сначала вхолостую — скрипт только покажет,
# что собирается менять:
#     sudo bash add-domains.sh
# Убедились — применяем:
#     sudo APPLY=1 bash add-domains.sh
set -euo pipefail

# ── что правим ───────────────────────────────────────────────────────────────
# Все домены, на которых должен открываться сайт. ПЕРВЫЙ считается основным:
# на него выписывается сертификат, остальные идут в него же как SAN.
# www-вариант — отдельное имя, если он нужен, впишите его тоже.
#
# Можно не править файл, а передать список через окружение:
#     sudo DOMAINS="tutor.justtostudy.kz app.jtstudy-english.kz" bash add-domains.sh
if [ -n "${DOMAINS:-}" ]; then
  read -r -a DOMAINS <<< "$DOMAINS"
else
  DOMAINS=(
    "tutor.justtostudy.kz"
    "app.jtstudy-english.kz"
  )
fi
# Почта для Let's Encrypt (уведомления об истечении сертификата).
EMAIL="justtostudy01@gmail.com"
# Контейнер прод-сайта. Из него узнаём порт, по которому его ищет nginx.
CONTAINER="${CONTAINER:-jts-production-web-1}"
# Конфиг nginx. Пусто — найдём сами по проброшенному порту контейнера.
CONF="${CONF:-}"

APPLY="${APPLY:-0}"
say() { printf '%s\n' "$*"; }
die() { printf 'ОШИБКА: %s\n' "$*" >&2; exit 1; }

# ── 1. порт, на который nginx проксирует сайт ────────────────────────────────
if [ -z "$CONF" ]; then
  PORT="$(docker port "$CONTAINER" 3000 2>/dev/null | head -1 | sed 's/.*://')" \
    || die "не вижу контейнер $CONTAINER — проверьте docker ps"
  [ -n "$PORT" ] || die "у $CONTAINER не проброшен порт 3000"
  say "Контейнер $CONTAINER слушает на хосте порт $PORT"

  mapfile -t FOUND < <(grep -rl "proxy_pass.*:${PORT}" /etc/nginx/sites-available /etc/nginx/conf.d 2>/dev/null || true)
  [ "${#FOUND[@]}" -gt 0 ] || die "не нашёл конфиг nginx с proxy_pass на :$PORT — укажите его явно: CONF=/etc/nginx/sites-available/... "
  [ "${#FOUND[@]}" -eq 1 ] || die "таких конфигов несколько: ${FOUND[*]} — укажите нужный через CONF="
  CONF="${FOUND[0]}"
fi
[ -f "$CONF" ] || die "нет файла $CONF"
say "Конфиг: $CONF"

say ""
say "=== server_name сейчас ==="
grep -nE '^[[:space:]]*server_name' "$CONF" || die "в конфиге нет ни одной строки server_name"

# ── 2. DNS: все имена должны уже смотреть на этот сервер ─────────────────────
# Без этого certbot не пройдёт HTTP-01 и оставит конфиг наполовину правленым.
# SKIP_DNS=1 — когда домен закрыт прокси (Cloudflare и подобные): A-запись
# тогда показывает адрес прокси, а не сервера, и сверять их бессмысленно. Но
# и HTTP-01 в таком случае пройдёт только при выключенном «оранжевом облаке».
MYIP="$(curl -fsS --max-time 10 https://api.ipify.org || true)"
say ""
say "=== DNS (внешний адрес сервера: ${MYIP:-неизвестен}) ==="
DNS_BAD=0
if [ "${SKIP_DNS:-0}" = "1" ]; then
  say "  пропущено (SKIP_DNS=1)"
else
  for d in "${DOMAINS[@]}"; do
    ips="$(getent ahostsv4 "$d" 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ')"
    if [ -z "$ips" ]; then
      say "  $d — НЕ РЕЗОЛВИТСЯ"; DNS_BAD=1
    elif [ -n "$MYIP" ] && ! printf '%s' "$ips" | grep -qw "$MYIP"; then
      say "  $d → $ips (ждали $MYIP) — СМОТРИТ НЕ СЮДА"; DNS_BAD=1
    else
      say "  $d → $ips — ок"
    fi
  done
  [ "$DNS_BAD" -eq 0 ] || die "сначала заведите A-записи на $MYIP и дождитесь их распространения"
fi

# ── 3. что получится ─────────────────────────────────────────────────────────
NEW_NAMES="${DOMAINS[*]}"
say ""
say "=== станет ==="
say "  server_name $NEW_NAMES;"
say "  сертификат на: $NEW_NAMES"

if [ "$APPLY" != "1" ]; then
  say ""
  say "Это был холостой прогон — ничего не изменено. Применить: sudo APPLY=1 bash $0"
  exit 0
fi

# ── 4. правим ────────────────────────────────────────────────────────────────
BACKUP="${CONF}.bak.$(date +%Y%m%d-%H%M%S)"
cp -a "$CONF" "$BACKUP"
say ""
say "Бэкап: $BACKUP"

# Заменяем ВСЕ строки server_name: у конфига, которым уже управлял certbot, их
# две — в ssl-блоке и в блоке-редиректе с :80. Обе должны знать все имена,
# иначе по новому домену придёт «Welcome to nginx» из дефолтного сервера.
sed -i -E "s/^([[:space:]]*)server_name[[:space:]]+.*/\1server_name ${NEW_NAMES};/" "$CONF"
nginx -t || { cp -a "$BACKUP" "$CONF"; die "nginx -t не прошёл — конфиг возвращён из бэкапа"; }
systemctl reload nginx
say "nginx перезагружен"

# ── 5. сертификат на все имена ───────────────────────────────────────────────
# --expand: в существующий сертификат добавляются новые имена, старые остаются
# (иначе certbot спросит и в неинтерактивном режиме упадёт).
CERTBOT_ARGS=()
for d in "${DOMAINS[@]}"; do CERTBOT_ARGS+=(-d "$d"); done
# --redirect обязателен явно: блок на :80, который certbot когда-то завёл,
# перенаправляет на https только те имена, что перечислены в нём построчно
# («if ($host = ...)»), а остальным отдаёт 404. Новый домен без этого шага
# открывался бы по https и ломался по http.
certbot --nginx --expand --redirect --non-interactive --agree-tos -m "$EMAIL" "${CERTBOT_ARGS[@]}"

nginx -t && systemctl reload nginx

say ""
say "=== проверка ==="
for d in "${DOMAINS[@]}"; do
  https="$(curl -o /dev/null -s -w '%{http_code}' --max-time 15 "https://$d/" || echo '---')"
  http="$(curl -o /dev/null -s -w '%{http_code}' --max-time 15 "http://$d/" || echo '---')"
  say "  $d: https → $https, http → $http (ждём 200 и 301)"
  grep -q "\$host = $d" "$CONF" \
    || say "    ВНИМАНИЕ: в $CONF нет строки «if (\$host = $d)» — http на этом домене не перенаправится, допишите её рядом с такой же строкой соседнего домена"
done

cat <<'NOTE'

ОСТАЛОСЬ РУКАМИ — иначе на новых доменах молча отвалится вход через Google:
  console.cloud.google.com → APIs & Services → Credentials → OAuth client
  (тот, чей id лежит в NEXT_PUBLIC_GOOGLE_CLIENT_ID) → Authorized JavaScript
  origins → добавить https://<каждый новый домен>. Google Identity Services
  сверяет origin страницы, и на незарегистрированном домене кнопка просто не
  отрисуется.

И помните про сессии: токены лежат в localStorage, а он привязан к домену.
Человек, вошедший на одном домене, на другом окажется гостем — это не поломка,
так устроен браузер.
NOTE
