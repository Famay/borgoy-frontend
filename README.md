# VerMeat

VerMeat - веб-приложение для цифровой верификации партий боргойской баранины. Поставщик создает партию, загружает сертификат, система считает SHA-256 файла, сохраняет сертификат в Pinata/IPFS, фиксирует хеш в Polygon Amoy и выдает QR-код для публичной проверки.

## Возможности

- регистрация и вход поставщика;
- JWT-авторизация и роли `SUPPLIER`/`ADMIN`;
- создание партий продукции;
- загрузка сертификатов с серверным расчетом SHA-256;
- проверка дублей сертификатов по хешу файла;
- загрузка файлов в Pinata/IPFS или демонстрационный режим без внешних ключей;
- запись хеша сертификата в Polygon Amoy или демонстрационный режим без RPC/ключа;
- публичная проверка по QR-токену, номеру партии или номеру сертификата;
- админская сводка, журнал аудита, изменение статуса и удаление сертификатов;
- Docker Compose контур с PostgreSQL, API и Nginx-фронтендом.

## Стек

- Фронтенд: React, TypeScript, Vite, React Router.
- Бекенд: Express, TypeScript, Zod, JWT, bcrypt, Multer.
- База данных: PostgreSQL, Prisma.
- Блокчейн: Solidity, Hardhat, ethers.js, Polygon Amoy.
- Файлы: Pinata/IPFS.
- Деплой: Docker, Docker Compose, Nginx.

## Структура проекта

- `src/` - фронтенд-приложение.
- `server/` - Express API.
- `prisma/` - схема, миграции и начальные данные.
- `contracts/` - Solidity-контракт.
- `test/` - тесты смарт-контракта.
- `ignition/` - модуль деплоя Hardhat Ignition.
- `nginx/` - конфигурация обратного прокси.
- `docs/vermeat-roadmap.md` - дорожная карта проекта.

## Требования

- Node.js 22 или совместимая версия.
- npm.
- PostgreSQL 16 для локального запуска без Docker.
- Docker и Docker Compose для контейнерного запуска.

## Быстрый локальный запуск

1.Установить зависимости:

```powershell
npm install
```

2.Создать локальный `.env`:

```powershell
Copy-Item .env.example .env
```

3.Поднять PostgreSQL локально или через Docker:

```powershell
docker compose up -d postgres
```

4.Применить миграции и загрузить начальные данные:

```powershell
npm run prisma:generate
npm run prisma:migrate
npx prisma db seed
```

5.Запустить API:

```powershell
npm run dev:api
```

6.В отдельном терминале запустить фронтенд:

```powershell
npm run dev
```

По умолчанию фронтенд доступен на `http://127.0.0.1:5173`, API - на `http://127.0.0.1:4000/api`.

## Демо-аккаунты

Загрузка начальных данных создает два пользователя:

- поставщик: `supplier@vermeat.ru` / `supplier123`;
- администратор: `admin@vermeat.ru` / `admin123`.

## Переменные окружения

Основные переменные лежат в `.env.example`.

- `DATABASE_URL` - строка подключения к PostgreSQL.
- `JWT_SECRET` - секрет подписи JWT; в боевом окружении должен быть сильным и уникальным.
- `JWT_EXPIRES_IN` - срок жизни токена доступа.
- `SERVER_PORT` - порт Express API.
- `CLIENT_ORIGIN` - разрешенный адрес фронтенда для CORS.
- `PUBLIC_APP_URL` - публичный адрес приложения для генерации QR-ссылок.
- `VITE_API_URL` - адрес API для фронтенда.
- `PINATA_JWT` - JWT-токен Pinata; если пустой, используется демонстрационный CID.
- `PINATA_GATEWAY` - шлюз Pinata для публичных IPFS-ссылок.
- `POLYGON_AMOY_RPC_URL` - RPC URL сети Polygon Amoy.
- `POLYGON_PRIVATE_KEY` - приватный ключ кошелька, который пишет в контракт.
- `CERTIFICATE_CONTRACT_ADDRESS` - адрес задеплоенного `CertificateRegistry`.

Если `PINATA_JWT`, `POLYGON_AMOY_RPC_URL`, `POLYGON_PRIVATE_KEY` или `CERTIFICATE_CONTRACT_ADDRESS` не заполнены, бекенд работает в демонстрационном режиме: генерирует CID и хеш транзакции без внешней записи.

## Запуск через Docker Compose

1.Создать `.env` из примера и при необходимости поменять порты/секреты.

```powershell
Copy-Item .env.example .env
```

2.Собрать и поднять сервисы:

```powershell
docker compose up --build
```

3.При первом запуске можно загрузить начальные данные:

```powershell
docker compose exec api npx prisma db seed
```

В Docker-режиме фронтенд доступен на `http://localhost`, API проксируется через Nginx по пути `/api`.

## Деплой на сервер

Для боевого запуска добавлен отдельный Docker Compose файл:

- `docker-compose.prod.yml` - PostgreSQL, API, Nginx-фронтенд и Certbot;
- `nginx/templates/http.conf.template` - первичный HTTP-конфиг для выпуска сертификата;
- `nginx/templates/ssl.conf.template` - HTTPS-конфиг после выпуска сертификата;
- `.env.production.example` - пример переменных окружения для сервера.

Пошаговая инструкция находится в [docs/deployment.md](docs/deployment.md).

## Основные команды

- `npm run dev` - запустить фронтенд в режиме разработки.
- `npm run dev:api` - запустить API в режиме разработки.
- `npm run start:api` - запустить API без режима наблюдения за файлами.
- `npm run build` - собрать фронтенд и проверить TypeScript.
- `npm run lint` - запустить ESLint.
- `npm run server:typecheck` - проверить бекенд TypeScript-компилятором.
- `npm run prisma:generate` - сгенерировать Prisma Client.
- `npm run prisma:migrate` - применить локальные миграции.
- `npm run prisma:deploy` - применить производственные миграции.
- `npm run prisma:studio` - открыть Prisma Studio.
- `npm run hardhat:compile` - скомпилировать контракт.
- `npm run hardhat:test` - запустить тесты смарт-контракта.
- `npm run hardhat:deploy:amoy` - задеплоить контракт в Polygon Amoy.

## API

Основные маршруты:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/batches`
- `POST /api/batches`
- `GET /api/certificates`
- `GET /api/certificates/check-file?hash=...`
- `POST /api/batches/:batchId/certificates`
- `GET /api/public/verify?query=...`
- `GET /api/admin/overview`
- `GET /api/admin/audit-logs`
- `PATCH /api/admin/certificates/:certificateNo/status`
- `DELETE /api/admin/certificates/:certificateNo`

## Проверка перед изменениями

Перед слиянием изменений желательно запускать:

```powershell
npm run lint
npm run build
npm run server:typecheck
npm run hardhat:test
```

## Публичная проверка

Проверка доступна без авторизации на странице `/verify`. Можно искать по:

- QR-токену партии;
- номеру партии;
- номеру сертификата.

API-эквивалент:

```text
GET /api/public/verify?query=BORG-2026-0241
GET /api/public/verify?batchNumber=BORG-2026-0241
GET /api/public/verify?certificateNo=CERT-2026-001
```

## Деплой смарт-контракта

1. Заполнить в `.env`:

```text
POLYGON_AMOY_RPC_URL="..."
POLYGON_PRIVATE_KEY="..."
```

2.Скомпилировать и проверить контракт:

```powershell
npm run hardhat:compile
npm run hardhat:test
```

3.Задеплоить контракт:

```powershell
npm run hardhat:deploy:amoy
```

4.Записать адрес контракта в `.env`:

```text
CERTIFICATE_CONTRACT_ADDRESS="0x..."
```

## Что важно перед боевым запуском

- заменить `JWT_SECRET` на сильный секрет;
- настроить реальные `CLIENT_ORIGIN` и `PUBLIC_APP_URL`;
- заполнить Pinata и Polygon Amoy переменные;
- включить HTTPS перед публичным доступом;
- настроить резервное копирование PostgreSQL;
- убрать резервные демо-данные фронтенда из боевого сценария;
- заменить удаление сертификата на аннулирование с причиной.

## Дорожная карта

Следующие задачи и приоритеты описаны в [docs/vermeat-roadmap.md](docs/vermeat-roadmap.md).
