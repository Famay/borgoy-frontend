# Деплой VerMeat на сервер

Инструкция описывает боевой запуск через Docker Compose, Nginx и Let's Encrypt.

## Что нужно до запуска

- Сервер с открытыми портами `80` и `443`.
- Установленные Docker и плагин Docker Compose.
- Домен с `A`-записью на IP сервера.
- Доступ к репозиторию на сервере.

## 1. Подготовить проект на сервере

```bash
git clone https://github.com/Famay/borgoy-frontend.git
cd borgoy-frontend
cp .env.production.example .env
```

Для production compose файл окружения должен называться `.env`.

В `.env` обязательно заменить:

- `POSTGRES_PASSWORD` - пароль базы данных;
- `JWT_SECRET` - длинный случайный секрет;
- `PUBLIC_APP_URL` и `CLIENT_ORIGIN` - боевой адрес сайта, например `https://example.com`;
- `SERVER_NAME` - домены для Nginx, например `example.com www.example.com`;
- `CERTBOT_DOMAIN` - основной домен сертификата, например `example.com`;
- `LETSENCRYPT_EMAIL` - email для Let's Encrypt;
- `PINATA_JWT`, `PINATA_GATEWAY`, `POLYGON_AMOY_RPC_URL`, `POLYGON_PRIVATE_KEY`, `CERTIFICATE_CONTRACT_ADDRESS` - если нужен реальный IPFS и Polygon Amoy без демонстрационного режима.

На первом запуске оставить:

```text
NGINX_TEMPLATE="./nginx/templates/http.conf.template"
```

## 2. Запустить HTTP-контур

```bash
docker compose -f docker-compose.prod.yml up -d --build postgres api web
```

Проверить API:

```bash
curl http://example.com/api/health
```

Если ответ есть, можно выпускать сертификат.

## 3. Получить TLS-сертификат

Для одного домена:

```bash
docker compose -f docker-compose.prod.yml --profile certbot run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email admin@example.com \
  --agree-tos \
  --no-eff-email \
  -d example.com
```

Если используется `www`, добавить второй домен:

```bash
docker compose -f docker-compose.prod.yml --profile certbot run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email admin@example.com \
  --agree-tos \
  --no-eff-email \
  -d example.com \
  -d www.example.com
```

После успешного выпуска сертификата поменять в `.env`:

```text
NGINX_TEMPLATE="./nginx/templates/ssl.conf.template"
```

И пересоздать контейнер фронтенда:

```bash
docker compose -f docker-compose.prod.yml up -d web
```

Проверить:

```bash
curl https://example.com/api/health
```

## 4. Загрузить начальные данные

Если нужны демо-пользователи и демо-партия:

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma db seed
```

Демо-аккаунты:

- поставщик: `supplier@vermeat.ru` / `supplier123`;
- администратор: `admin@vermeat.ru` / `admin123`.

Для боевого запуска пароли демо-аккаунтов нужно заменить или не загружать начальные данные.

## 5. Обновление приложения

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

API сам применяет производственные миграции командой `npm run prisma:deploy` перед запуском.

## 6. Продление сертификата

Проверить продление вручную:

```bash
docker compose -f docker-compose.prod.yml --profile certbot run --rm certbot renew \
  --webroot \
  --webroot-path /var/www/certbot

docker compose -f docker-compose.prod.yml exec web nginx -s reload
```

Для автоматизации можно добавить cron на сервере:

```cron
0 3 * * * cd /opt/vermeat && docker compose -f docker-compose.prod.yml --profile certbot run --rm certbot renew --webroot --webroot-path /var/www/certbot && docker compose -f docker-compose.prod.yml exec -T web nginx -s reload
```

Путь `/opt/vermeat` заменить на фактическую директорию проекта.

## 7. Резервная копия PostgreSQL

Создать директорию для резервных копий:

```bash
mkdir -p backups
```

Сделать дамп:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump \
  -U postgres \
  vermeat > backups/vermeat-$(date +%F).sql
```

Если в `.env` другие `POSTGRES_USER` или `POSTGRES_DB`, заменить значения в команде.

## 8. Быстрая диагностика

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f postgres
```

Частые причины ошибок:

- DNS домена еще не указывает на сервер;
- закрыты порты `80` или `443`;
- в `.env` указан неправильный `PUBLIC_APP_URL`;
- выбран `ssl.conf.template`, но сертификат еще не выпущен;
- `JWT_SECRET` слишком короткий или оставлен примерным;
- переменные Pinata/Polygon Amoy пустые, поэтому приложение работает в демонстрационном режиме.
