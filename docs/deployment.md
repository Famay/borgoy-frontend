# Деплой VerMeat на сервер

Документ описывает production-запуск VerMeat через Docker Compose, Nginx, PostgreSQL и Let's Encrypt.

## 1. Что должно быть готово

На сервере должны быть:

- Linux-сервер с открытыми портами `80` и `443`;
- установленный Docker;
- установленный Docker Compose plugin;
- домен с `A`-записью на IP сервера;
- репозиторий проекта на сервере;
- заполненный `.env`;
- тестовые POL на кошельке Polygon Amoy, если используется реальная blockchain-запись;
- Pinata JWT, если используется реальный IPFS.

## 2. Подготовка проекта

```bash
cd /opt
git clone https://github.com/Famay/borgoy-frontend.git vermeat
cd /opt/vermeat
cp .env.example .env
```

Если проект уже есть на сервере:

```bash
cd /opt/vermeat
git pull
```

## 3. Настройка `.env`

Минимально нужно заполнить:

```env
POSTGRES_DB=vermeat
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>

JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=7d
INTEGRATION_MODE=live

PUBLIC_APP_URL=https://vermeat.ru
CLIENT_ORIGIN=https://vermeat.ru
DOCKER_VITE_API_URL=/api

SERVER_NAME=vermeat.ru www.vermeat.ru
CERTBOT_DOMAIN=vermeat.ru
LETSENCRYPT_EMAIL=<email>
NGINX_TEMPLATE=./nginx/templates/http.conf.template
```

Для email-кодов:

```env
TWO_FACTOR_EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.maileroo.com
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-password>
EMAIL_FROM="VerMeat <no-reply@example.com>"
```

Для Pinata/IPFS:

```env
PINATA_JWT=<pinata-jwt>
PINATA_GATEWAY=<gateway-domain>
```

Для Polygon Amoy:

```env
POLYGON_AMOY_RPC_URL=https://polygon-amoy.drpc.org
POLYGON_PRIVATE_KEY=<wallet-private-key>
CERTIFICATE_CONTRACT_ADDRESS=<deployed-contract-address>
```

Важно: реальные секреты нельзя хранить в git и нельзя отправлять в frontend.

## 4. Первый запуск по HTTP

На первом запуске используется HTTP-шаблон Nginx, чтобы Certbot смог подтвердить домен:

```env
NGINX_TEMPLATE=./nginx/templates/http.conf.template
```

Запуск:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Проверить контейнеры:

```bash
docker compose -f docker-compose.prod.yml ps
```

Проверить API:

```bash
curl http://vermeat.ru/api/health
```

Ожидаемый ответ:

```json
{"status":"ok","service":"vermeat-api"}
```

## 5. Получение SSL-сертификата

Для домена без `www`:

```bash
docker compose -f docker-compose.prod.yml --profile certbot run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email <email> \
  --agree-tos \
  --no-eff-email \
  -d vermeat.ru
```

Для домена с `www`:

```bash
docker compose -f docker-compose.prod.yml --profile certbot run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email <email> \
  --agree-tos \
  --no-eff-email \
  -d vermeat.ru \
  -d www.vermeat.ru
```

Если Certbot пишет `Certificate not yet due for renewal`, выбрать:

```text
1: Keep the existing certificate for now
```

## 6. Переключение на HTTPS

После получения сертификата поменять в `.env`:

```env
NGINX_TEMPLATE=./nginx/templates/ssl.conf.template
PUBLIC_APP_URL=https://vermeat.ru
CLIENT_ORIGIN=https://vermeat.ru
```

Пересоздать web-контейнер:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate --no-deps web
```

Проверить Nginx:

```bash
docker compose -f docker-compose.prod.yml exec web nginx -T | grep -E "listen 80|listen 443|ssl_certificate"
```

Проверить HTTPS:

```bash
curl -I https://vermeat.ru
curl https://vermeat.ru/api/health
```

## 7. Обновление приложения

На сервере:

```bash
cd /opt/vermeat
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

API при старте выполняет:

```bash
npm run prisma:deploy
```

Поэтому production-миграции применяются автоматически перед запуском backend.

## 8. Деплой смарт-контракта

Локально или на сервере с заполненными переменными:

```bash
npm run hardhat:compile
npm run hardhat:deploy:amoy
```

После деплоя адрес контракта записать в `.env`:

```env
CERTIFICATE_CONTRACT_ADDRESS=<address>
```

Перезапустить API:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate --no-deps api
```

## 9. Seed-данные

Если нужны демонстрационные данные:

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma db seed
```

Для production лучше не использовать демонстрационные пароли. Если seed был применен на публичном сервере, демо-аккаунты нужно заменить или отключить.

## 10. Логи и диагностика

Контейнеры:

```bash
docker compose -f docker-compose.prod.yml ps
```

Логи API:

```bash
docker compose -f docker-compose.prod.yml logs --tail=100 api
docker compose -f docker-compose.prod.yml logs -f api
```

Логи web/Nginx:

```bash
docker compose -f docker-compose.prod.yml logs --tail=100 web
docker compose -f docker-compose.prod.yml logs -f web
```

Логи PostgreSQL:

```bash
docker compose -f docker-compose.prod.yml logs --tail=100 postgres
```

Проверка портов:

```bash
sudo ss -tulpn | grep -E ':80|:443'
```

Проверка DNS:

```bash
curl -4 ifconfig.me
dig +short vermeat.ru
dig +short www.vermeat.ru
```

## 11. Частые проблемы

### `https://vermeat.ru` не открывается

Проверить:

- контейнер `web` запущен;
- порт `443` открыт;
- сертификат реально выпущен;
- в `.env` указан `NGINX_TEMPLATE=./nginx/templates/ssl.conf.template`;
- web-контейнер пересоздан после изменения `.env`;
- `nginx -T` показывает `listen 443` и `ssl_certificate`.

### Nginx слушает только 80

Значит web-контейнер использует HTTP-шаблон.

Проверить:

```bash
docker compose -f docker-compose.prod.yml config | sed -n '/web:/,/certbot:/p'
```

Если там смонтирован `http.conf.template`, поменять `.env` на SSL-шаблон и пересоздать `web`.

### CORS 403

Проверить:

```env
PUBLIC_APP_URL=https://vermeat.ru
CLIENT_ORIGIN=https://vermeat.ru
```

Backend автоматически разрешает вариант с `www` и без `www`, но после изменения `.env` нужно пересоздать `api`:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate --no-deps api
```

### 2FA-коды не приходят

Проверить:

- `TWO_FACTOR_EMAIL_PROVIDER`;
- `SMTP_HOST`;
- `SMTP_PORT`;
- `SMTP_USER`;
- `SMTP_PASSWORD`;
- `EMAIL_FROM`;
- подтверждение домена у email-провайдера;
- логи API.

Для временной проверки можно включить файловый режим:

```env
TWO_FACTOR_EMAIL_PROVIDER=file
```

Тогда коды будут писаться внутри контейнера API в:

```text
server/email-outbox/2fa-codes.txt
```

### IPFS работает в demo-режиме

Причина: задано `INTEGRATION_MODE=demo`. Такой режим предназначен для локальной
разработки и тестов. При `NODE_ENV=production` API откажется запускаться.

Включить live-режим и заполнить:

```env
INTEGRATION_MODE=live
PINATA_JWT=<pinata-jwt>
PINATA_GATEWAY=<gateway>
```

### Blockchain работает в demo-режиме

Причина: задано `INTEGRATION_MODE=demo`.

Для production включить live-режим и заполнить:

```env
INTEGRATION_MODE=live
POLYGON_AMOY_RPC_URL
POLYGON_PRIVATE_KEY
CERTIFICATE_CONTRACT_ADDRESS
```

Также проверить, что на кошельке есть тестовые POL.

## 12. Резервное копирование PostgreSQL

Создать папку:

```bash
mkdir -p backups
```

Сделать dump:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump \
  -U postgres \
  vermeat > backups/vermeat-$(date +%F).sql
```

Если в `.env` другие `POSTGRES_USER` или `POSTGRES_DB`, заменить значения в команде.

## 13. Продление SSL

Ручная проверка:

```bash
docker compose -f docker-compose.prod.yml --profile certbot run --rm certbot renew \
  --webroot \
  --webroot-path /var/www/certbot

docker compose -f docker-compose.prod.yml exec web nginx -s reload
```

Cron-пример:

```cron
0 3 * * * cd /opt/vermeat && docker compose -f docker-compose.prod.yml --profile certbot run --rm certbot renew --webroot --webroot-path /var/www/certbot && docker compose -f docker-compose.prod.yml exec -T web nginx -s reload
```

## 14. Production checklist

- [ ] `.env` заполнен без примерных секретов.
- [ ] `POSTGRES_PASSWORD` заменен.
- [ ] `JWT_SECRET` заменен.
- [ ] Домен указывает на сервер.
- [ ] Порты `80` и `443` открыты.
- [ ] HTTP-контур стартует.
- [ ] `/api/health` отвечает.
- [ ] TLS-сертификат выпущен.
- [ ] `NGINX_TEMPLATE` переключен на SSL.
- [ ] `https://vermeat.ru/api/health` отвечает.
- [ ] SMTP/2FA проверен.
- [ ] Pinata/IPFS проверен.
- [ ] Polygon Amoy проверен.
- [ ] Полный сценарий поставщика пройден.
- [ ] Публичная проверка работает.
- [ ] Dashboard администратора работает.
