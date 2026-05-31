# VerMeat

VerMeat - дипломный проект для цифровой верификации происхождения боргойской баранины и проверки подлинности сопроводительных сертификатов.

Система позволяет поставщику зарегистрировать партию продукции, загрузить сертификат, зафиксировать контрольные данные в IPFS и Polygon Amoy, а покупателю проверить продукцию по QR-коду, номеру партии или номеру сертификата.

## Возможности

- регистрация и вход поставщика;
- двухфакторный вход поставщика через email-код;
- создание партий продукции;
- загрузка сертификатов;
- проверка формата PDF, PNG или JPEG и лимита 10 МБ при загрузке;
- расчет SHA-256 хеша сертификата;
- загрузка файла сертификата в Pinata/IPFS;
- фиксация хеша сертификата в смарт-контракте Polygon Amoy;
- генерация QR-кода публичной проверки;
- публичная проверка без регистрации;
- rate limiting для входа, подтверждения 2FA и публичной проверки;
- личная страница поставщика с его сертификатами;
- список партий с поиском и пагинацией;
- детальная страница партии с QR-кодом, сертификатами и историей проверок;
- административный dashboard;
- реестр сертификатов с фильтрами;
- аннулирование сертификатов с сохранением причины и истории;
- управление поставщиками с поиском, фильтром статуса и пагинацией;
- журнал аудита с фильтрами и пагинацией;
- страница состояния системы;
- явный режим интеграций `INTEGRATION_MODE=demo|live` с запретом demo в production;
- Docker/Nginx/PostgreSQL контур для деплоя.

## Стек

- Frontend: React, TypeScript, Vite, React Router.
- Backend: Node.js, Express, TypeScript, Zod, Multer, JWT, bcrypt.
- Database: PostgreSQL, Prisma.
- Blockchain: Solidity, Hardhat, ethers.js, Polygon Amoy.
- Storage: Pinata/IPFS.
- Email 2FA: SMTP, Resend или файловый outbox для теста.
- Deploy: Docker Compose, Nginx, Certbot/Let's Encrypt.

## Структура

```text
src/                  frontend
server/               backend API
prisma/               схема БД, миграции, seed
contracts/            Solidity smart contract
ignition/             Hardhat Ignition deploy
nginx/                Nginx конфиги
docs/                 документация проекта
docker-compose.yml    локальный Docker-контур
docker-compose.prod.yml production Docker-контур
```

## Быстрый локальный запуск

1. Установить зависимости:

```powershell
npm.cmd install
```

2. Создать `.env`:

```powershell
Copy-Item .env.example .env
```

3. Запустить PostgreSQL:

```powershell
docker compose up -d postgres
```

4. Применить Prisma:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
```

5. Запустить API:

```powershell
npm.cmd run start:api
```

6. Запустить frontend:

```powershell
npm.cmd run dev
```

Локальные адреса:

- frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:4000/api`
- healthcheck: `http://127.0.0.1:4000/api/health`

## Основные команды

```powershell
npm.cmd run dev
npm.cmd run start:api
npm.cmd run build
npm.cmd run lint
npm.cmd run server:typecheck
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:deploy
npm.cmd run test:api
npm.cmd run hardhat:compile
npm.cmd run hardhat:test
npm.cmd run hardhat:deploy:amoy
```

## Интеграционные тесты API

Минимальный backend-сценарий запускается командой:

```powershell
npm.cmd run test:api
```

Runner использует `TEST_DATABASE_URL` или создает имя тестовой базы из
`DATABASE_URL`, добавляя суффикс `_test`. Перед запуском тестов применяются
Prisma-миграции. Очистка данных разрешена только для базы с суффиксом `_test`.

## Переменные окружения

Шаблон находится в `.env.example`.

Основные группы переменных:

- PostgreSQL: `POSTGRES_*`, `DATABASE_URL`, `TEST_DATABASE_URL`;
- авторизация: `JWT_SECRET`, `JWT_EXPIRES_IN`, `RATE_LIMIT_*`;
- frontend/API: `CLIENT_ORIGIN`, `PUBLIC_APP_URL`, `VITE_API_URL`;
- email 2FA: `TWO_FACTOR_EMAIL_PROVIDER`, `EMAIL_FROM`, `SMTP_*`, `RESEND_API_KEY`;
- режим интеграций: `INTEGRATION_MODE=demo|live`;
- IPFS: `PINATA_JWT`, `PINATA_GATEWAY`;
- Polygon Amoy: `POLYGON_AMOY_RPC_URL`, `POLYGON_PRIVATE_KEY`, `CERTIFICATE_CONTRACT_ADDRESS`;
- TLS/deploy: `SERVER_NAME`, `CERTBOT_DOMAIN`, `LETSENCRYPT_EMAIL`, `NGINX_TEMPLATE`.

Реальные секреты нельзя коммитить в репозиторий.

## Документация

- Полная документация проекта: [docs/project-documentation.md](docs/project-documentation.md)
- Деплой на сервер: [docs/deployment.md](docs/deployment.md)
- Roadmap: [docs/vermeat-roadmap.md](docs/vermeat-roadmap.md)

## Проверки перед деплоем

```powershell
npm.cmd run lint
npm.cmd run server:typecheck
npm.cmd run build
```

Для smart contract:

```powershell
npm.cmd run hardhat:compile
npm.cmd run hardhat:test
```

## Production

Production-запуск выполняется через:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Подробный порядок настройки домена, SSL, `.env`, миграций и диагностики описан в [docs/deployment.md](docs/deployment.md).
