# Документация проекта VerMeat

Документ описывает текущее состояние проекта VerMeat: назначение системы, архитектуру, стек технологий, запуск, переменные окружения, API, базу данных, безопасность, интеграции с IPFS и Polygon Amoy, деплой и эксплуатацию.

## 1. Назначение проекта

VerMeat - дипломный веб-проект для цифровой верификации происхождения боргойской баранины и проверки подлинности сопроводительных сертификатов.

Система решает задачу прослеживаемости партии продукции:

1. Поставщик создает карточку партии.
2. Поставщик загружает сертификат или сопроводительный документ.
3. Сервер рассчитывает SHA-256 хеш файла.
4. Файл отправляется в IPFS через Pinata, в базе сохраняется CID.
5. Хеш сертификата фиксируется в смарт-контракте Polygon Amoy.
6. Система формирует QR-код публичной проверки.
7. Покупатель проверяет продукцию по QR-коду, номеру партии или номеру сертификата.
8. Администратор контролирует поставщиков, сертификаты, системные события и проблемные проверки.

Проект демонстрационный, но построен как полноценное веб-приложение с разделением на frontend, backend, базу данных и инфраструктурный контур.

## 2. Пользовательские роли

### Покупатель

Покупатель не обязан регистрироваться. Ему доступны:

- главная страница;
- страница о проекте;
- публичная проверка сертификата;
- ввод номера сертификата, номера партии или QR-токена;
- просмотр результата проверки, сведений о партии, поставщике, IPFS и blockchain-доказательствах.

### Поставщик

Поставщик работает после регистрации и входа в систему. Ему доступны:

- создание партии продукции;
- загрузка сертификата к своей партии;
- получение QR-кода;
- просмотр своих сертификатов;
- просмотр IPFS CID, SHA-256, tx hash и публичной ссылки проверки;
- вход с двухфакторным email-кодом.

### Администратор

Администратор контролирует систему. Ему доступны:

- dashboard администратора;
- реестр сертификатов;
- управление поставщиками;
- изменение статусов поставщиков;
- изменение статуса сертификата;
- удаление ошибочной записи сертификата;
- журнал аудита;
- страница состояния системы;
- профиль администратора.

Администратор не использует кабинет поставщика для создания партий. Это сделано, чтобы админские записи не смешивались с данными поставщиков.

## 3. Текущие возможности

- Регистрация поставщика.
- Вход по email и паролю.
- Двухфакторный вход для поставщиков через email-код.
- JWT-авторизация.
- Ролевой доступ: `SUPPLIER`, `ADMIN`.
- Создание партий продукции.
- Загрузка сертификатов через multipart/form-data.
- Расчет SHA-256 хеша файла на сервере.
- Проверка дубликатов по хешу файла.
- Загрузка сертификата в Pinata/IPFS.
- Фиксация хеша сертификата в Polygon Amoy.
- Генерация QR-кода публичной проверки.
- Публичная проверка без авторизации.
- Сканирование QR-кода через браузерный `BarcodeDetector`, если он поддерживается устройством.
- Реестр сертификатов с поиском и фильтрами.
- Страница "Мои сертификаты" для поставщика.
- Административный dashboard.
- Управление поставщиками.
- Журнал аудита.
- Страница состояния системы.
- Docker/Nginx/PostgreSQL контур для деплоя.
- Let's Encrypt через Certbot.

## 4. Технологический стек

### Frontend

| Технология | Назначение |
| --- | --- |
| React | Пользовательский интерфейс |
| TypeScript | Типизация frontend-кода |
| Vite | Сборка и dev-сервер |
| React Router | Клиентская маршрутизация |
| CSS | Глобальные стили интерфейса |
| qrcode | Генерация QR-кодов на клиенте при необходимости |

### Backend

| Технология | Назначение |
| --- | --- |
| Node.js | Runtime backend-части |
| Express | REST API |
| TypeScript | Типизация backend-кода |
| Zod | Валидация входных данных |
| Prisma | ORM и миграции базы данных |
| PostgreSQL | Основная база данных |
| bcrypt | Хеширование паролей и 2FA-кодов |
| jsonwebtoken | JWT-авторизация |
| multer | Загрузка файлов сертификатов |
| nodemailer | Отправка email-кодов через SMTP |
| ethers | Работа со смарт-контрактом |
| pinata | Загрузка файлов в IPFS через Pinata |
| qrcode | Генерация QR-кода на сервере |

### Blockchain и инфраструктура

| Технология | Назначение |
| --- | --- |
| Solidity | Смарт-контракт `CertificateRegistry` |
| Hardhat | Компиляция, тестирование и деплой контракта |
| Polygon Amoy | Тестовая сеть для фиксации хеша сертификата |
| Docker Compose | Контейнерный запуск |
| Nginx | Отдача frontend и reverse proxy для API |
| Certbot | Получение TLS-сертификата Let's Encrypt |

## 5. Структура проекта

```text
.
├── src/                         # Frontend React + TypeScript
│   ├── app/                     # App, AuthContext, CertificatesContext
│   ├── components/              # Общие компоненты интерфейса
│   ├── constants/               # Навигация
│   ├── data/                    # Демо-данные fallback-режима
│   ├── pages/                   # Страницы приложения
│   ├── services/                # Клиент API
│   ├── styles/                  # Глобальные стили
│   ├── types/                   # Типы frontend
│   └── utils/                   # Утилиты frontend
├── server/                      # Backend Express API
│   └── src/
│       ├── config/              # env-конфигурация
│       ├── db/                  # Prisma client
│       ├── middleware/          # Auth middleware
│       ├── modules/             # Роуты auth/admin/batches/certificates/public
│       ├── services/            # email, IPFS, blockchain
│       └── utils/               # hash, qr, otp, errors
├── prisma/                      # Prisma schema, миграции, seed
├── contracts/                   # Solidity-контракт
├── ignition/                    # Hardhat Ignition deployment
├── nginx/                       # Nginx конфиги и шаблоны
├── docs/                        # Документация
├── Dockerfile.api               # Docker-образ backend
├── Dockerfile.web               # Docker-образ frontend/Nginx
├── docker-compose.yml           # Локальный Docker-контур
├── docker-compose.prod.yml      # Production Docker-контур
├── hardhat.config.ts            # Конфигурация Hardhat
├── package.json                 # Скрипты и зависимости
└── README.md                    # Краткое описание проекта
```

## 6. Архитектура

### Общая схема

```text
Покупатель / Поставщик / Администратор
              │
              ▼
        React frontend
              │ REST / JSON / multipart
              ▼
        Express Backend API
        ├── PostgreSQL через Prisma
        ├── Pinata/IPFS
        ├── Polygon Amoy через ethers.js
        ├── SMTP/File email 2FA
        └── AuditLog
```

### Контейнерная схема production

```text
Internet
  │
  ▼
Nginx web container
  ├── /             -> React static files
  └── /api/*        -> api:4000
                      │
                      ▼
                 API container
                      │
                      ▼
               PostgreSQL container
```

Дополнительно API взаимодействует с внешними сервисами:

- SMTP-провайдер для email-кодов;
- Pinata/IPFS для файлов сертификатов;
- Polygon Amoy RPC для blockchain-записей.

## 7. Frontend

### Основные страницы

| Путь | Доступ | Назначение |
| --- | --- | --- |
| `/` | Все | Главная страница и публичная статистика |
| `/about` | Все | Информация о проекте |
| `/verify` | Все | Публичная проверка сертификата |
| `/login` | Все | Вход |
| `/register` | Все | Регистрация поставщика |
| `/supplier` | Поставщик | Создание партии и загрузка сертификата |
| `/my-certificates` | Поставщик | Сертификаты текущего поставщика |
| `/profile` | Поставщик, админ | Профиль пользователя |
| `/admin` | Админ | Dashboard |
| `/registry` | Админ | Реестр сертификатов |
| `/admin/suppliers` | Админ | Управление поставщиками |
| `/admin/status` | Админ | Состояние системы |
| `/admin/logs` | Админ | Журнал аудита |

### Контексты

`AuthContext` отвечает за:

- хранение текущего пользователя;
- хранение JWT-токена;
- вход;
- прохождение второго фактора;
- регистрацию;
- выход;
- восстановление сессии из localStorage.

`CertificatesContext` используется как fallback-слой для демо-данных. Основные production-сценарии работают через backend API.

### Клиент API

Основной файл: `src/services/api.ts`.

Он содержит функции:

- `loginRequest`;
- `verifyTwoFactorLoginRequest`;
- `registerRequest`;
- `createBatchRequest`;
- `uploadCertificateRequest`;
- `getCertificatesRequest`;
- `verifyCertificateRequest`;
- `getPublicStatsRequest`;
- `getAdminDashboardRequest`;
- `getAdminSuppliersRequest`;
- `updateSupplierStatusRequest`;
- `getAdminSystemStatusRequest`;
- `getAuditLogsRequest`;
- `updateCertificateStatusRequest`;
- `deleteCertificateRequest`.

## 8. Backend

Backend создается в `server/src/app.ts`.

Основные задачи backend:

- обработка REST API;
- авторизация и роли;
- валидация входных данных;
- работа с PostgreSQL через Prisma;
- загрузка сертификатов;
- расчет SHA-256;
- загрузка файлов в IPFS;
- запись сертификатов в Polygon Amoy;
- генерация QR-кодов;
- публичная проверка сертификатов;
- ведение журнала аудита;
- отдача состояния системы.

### Middleware

`server/src/middleware/auth.ts` реализует:

- проверку JWT;
- заполнение `req.user`;
- ограничение доступа по ролям через `requireRole`.

### Обработка ошибок

Ошибки обрабатываются централизованно в `server/src/app.ts`.

Обрабатываются:

- ошибки JSON;
- ошибки Zod;
- Prisma unique constraint;
- пользовательские `HttpError`;
- неизвестные ошибки как `500 Internal Server Error`.

## 9. API

Базовый URL локально:

```text
http://127.0.0.1:4000/api
```

В production:

```text
https://<domain>/api
```

### Health

| Метод | Endpoint | Доступ | Назначение |
| --- | --- | --- | --- |
| GET | `/api/health` | Все | Проверка работоспособности API |

### Auth

| Метод | Endpoint | Доступ | Назначение |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Все | Регистрация поставщика |
| POST | `/api/auth/login` | Все | Первый шаг входа |
| POST | `/api/auth/login/2fa` | Пользователь с challenge token | Подтверждение email-кода |
| GET | `/api/auth/me` | Авторизованный | Получить текущего пользователя |

### Batches

| Метод | Endpoint | Доступ | Назначение |
| --- | --- | --- | --- |
| GET | `/api/batches` | Поставщик, админ | Список партий. Поставщик видит свои, админ видит все |
| POST | `/api/batches` | Поставщик | Создать партию |

### Certificates

| Метод | Endpoint | Доступ | Назначение |
| --- | --- | --- | --- |
| GET | `/api/certificates` | Поставщик, админ | Список сертификатов |
| GET | `/api/certificates/check-file?hash=...` | Авторизованный | Проверка дубликата файла по SHA-256 |
| GET | `/api/certificates/:id` | Авторизованный | Детальная информация о сертификате |
| POST | `/api/batches/:batchId/certificates` | Поставщик | Загрузка сертификата к партии |

### Public

| Метод | Endpoint | Доступ | Назначение |
| --- | --- | --- | --- |
| GET | `/api/public/stats` | Все | Публичная статистика для главной страницы |
| GET | `/api/public/verify/:token` | Все | Проверка по QR-токену |
| GET | `/api/public/verify?query=...` | Все | Проверка по общей строке |
| GET | `/api/public/verify?batchNumber=...` | Все | Проверка по номеру партии |
| GET | `/api/public/verify?certificateNo=...` | Все | Проверка по номеру сертификата |

### Admin

| Метод | Endpoint | Доступ | Назначение |
| --- | --- | --- | --- |
| GET | `/api/admin/dashboard` | Админ | Dashboard администратора |
| GET | `/api/admin/status` | Админ | Состояние системы |
| GET | `/api/admin/suppliers` | Админ | Список поставщиков |
| PATCH | `/api/admin/suppliers/:supplierId/status` | Админ | Изменить статус поставщика |
| GET | `/api/admin/overview` | Админ | Сводка для профиля администратора |
| GET | `/api/admin/audit-logs` | Админ | Журнал аудита |
| PATCH | `/api/admin/certificates/:certificateNo/status` | Админ | Изменить статус сертификата |
| DELETE | `/api/admin/certificates/:certificateNo` | Админ | Удалить сертификат |

## 10. База данных

Схема описана в `prisma/schema.prisma`.

### Enums

`UserRole`:

- `SUPPLIER`;
- `ADMIN`.

`UserStatus`:

- `ACTIVE`;
- `PENDING`;
- `BLOCKED`.

`CertificateStatus`:

- `PENDING`;
- `CONFIRMED`;
- `MISMATCH`;
- `BLOCKCHAIN_FAILED`.

`AuditAction`:

- `USER_REGISTERED`;
- `USER_STATUS_UPDATED`;
- `USER_LOGIN`;
- `USER_LOGIN_2FA_FAILED`;
- `TWO_FACTOR_ENABLED`;
- `TWO_FACTOR_DISABLED`;
- `BATCH_CREATED`;
- `CERTIFICATE_UPLOADED`;
- `CERTIFICATE_STATUS_UPDATED`;
- `CERTIFICATE_DELETED`;
- `CERTIFICATE_VERIFIED`;
- `VERIFICATION_FAILED`.

### Таблицы

#### User

Хранит пользователей системы.

Основные поля:

- `id`;
- `name`;
- `companyName`;
- `email`;
- `phone`;
- `inn`;
- `passwordHash`;
- `role`;
- `status`;
- `twoFactorEnabled`;
- `twoFactorCodeHash`;
- `twoFactorCodeExpiresAt`;
- `twoFactorCodeAttempts`;
- `twoFactorCodeSentAt`;
- `createdAt`;
- `updatedAt`.

#### Batch

Хранит партии продукции.

Основные поля:

- `id`;
- `batchNumber`;
- `productName`;
- `originRegion`;
- `productionDate`;
- `weightKg`;
- `description`;
- `publicToken`;
- `supplierId`.

#### Certificate

Хранит сертификаты, связанные с партиями.

Основные поля:

- `id`;
- `certificateNo`;
- `documentNumber`;
- `authority`;
- `description`;
- `issueDate`;
- `status`;
- `fileName`;
- `fileMimeType`;
- `fileSize`;
- `fileHash`;
- `ipfsCid`;
- `qrPayload`;
- `qrCodeDataUrl`;
- `batchId`.

#### BlockchainTransaction

Хранит сведения о blockchain-транзакции.

Основные поля:

- `id`;
- `network`;
- `contract`;
- `txHash`;
- `blockNumber`;
- `certificateId`;
- `createdAt`.

#### VerificationResult

Хранит результаты публичных проверок.

Основные поля:

- `id`;
- `query`;
- `isValid`;
- `message`;
- `localHash`;
- `blockchainHash`;
- `batchId`;
- `certificateId`;
- `createdAt`.

#### AuditLog

Хранит журнал аудита.

Основные поля:

- `id`;
- `action`;
- `entity`;
- `entityId`;
- `message`;
- `userId`;
- `metadata`;
- `createdAt`.

## 11. Основные бизнес-процессы

### Регистрация поставщика

1. Пользователь открывает `/register`.
2. Вводит имя, компанию, email, телефон, ИНН и пароль.
3. Frontend отправляет `POST /api/auth/register`.
4. Backend валидирует данные через Zod.
5. Пароль хешируется через bcrypt.
6. Создается пользователь с ролью `SUPPLIER`.
7. Для поставщика включена двухфакторная идентификация.
8. Возвращается пользователь и JWT.

### Вход поставщика

1. Пользователь открывает `/login`.
2. Вводит email и пароль.
3. Backend проверяет пароль.
4. Если пользователь является поставщиком и 2FA включена, создается одноразовый код.
5. Код отправляется по email или пишется в файл в тестовом режиме.
6. Frontend показывает форму ввода кода.
7. Пользователь вводит код.
8. Backend проверяет код, срок действия и количество попыток.
9. После успеха возвращается JWT.

### Создание партии

1. Поставщик открывает `/supplier`.
2. Заполняет номер партии, продукт, регион, дату производства, массу и описание.
3. Frontend отправляет `POST /api/batches`.
4. Backend создает запись `Batch`.
5. Для партии генерируется `publicToken`.
6. Событие записывается в `AuditLog`.

### Загрузка сертификата

1. Поставщик выбирает созданную партию.
2. Загружает файл сертификата и вводит метаданные документа.
3. Frontend отправляет multipart-запрос `POST /api/batches/:batchId/certificates`.
4. Backend проверяет, что партия принадлежит текущему поставщику.
5. Сервер рассчитывает SHA-256 от содержимого файла.
6. Выполняется проверка дубликата по `fileHash`.
7. Файл загружается в Pinata/IPFS.
8. Backend регистрирует сертификат в смарт-контракте.
9. Генерируется QR-код публичной проверки.
10. В PostgreSQL создается `Certificate` и `BlockchainTransaction`.
11. В `AuditLog` пишется событие загрузки.
12. Frontend показывает результат: сертификат, CID, tx hash, QR-код, публичную ссылку.

### Публичная проверка

1. Покупатель открывает `/verify`.
2. Вводит номер сертификата, номер партии или сканирует QR-код.
3. Frontend отправляет запрос в `/api/public/verify`.
4. Backend ищет сертификат и партию в PostgreSQL.
5. Backend получает blockchain-запись через смарт-контракт.
6. Сравнивается локальный SHA-256 и blockchain-хеш.
7. Результат сохраняется в `VerificationResult`.
8. Событие сохраняется в `AuditLog`.
9. Frontend показывает статус проверки и доказательства.

## 12. Двухфакторная идентификация

2FA реализована для поставщиков. Для покупателей она не нужна, потому что публичная проверка должна быть простой и доступной без регистрации. Для администратора в текущем дипломном прототипе 2FA отключена, так как административная учетная запись используется для демонстрации и управления системой.

### Как работает 2FA

1. После успешной проверки пароля backend создает одноразовый код.
2. В базе сохраняется не код, а хеш кода.
3. Код имеет срок действия 5 минут.
4. Количество попыток ограничено.
5. Код отправляется через выбранный провайдер:
   - `file` - запись в `server/email-outbox/2fa-codes.txt`;
   - `smtp` - отправка через SMTP, например Maileroo;
   - `resend` - отправка через Resend API.

### Переменные для 2FA

```env
TWO_FACTOR_EMAIL_PROVIDER=file|smtp|resend
EMAIL_FROM="VerMeat <no-reply@example.com>"

# SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=

# Resend
RESEND_API_KEY=
```

## 13. IPFS

IPFS используется для хранения файлов сертификатов.

Основной сервис: `server/src/services/ipfs.service.ts`.

### Логика

1. Backend получает файл сертификата.
2. Создает объект `File`.
3. Загружает файл в Pinata.
4. Pinata возвращает CID.
5. CID сохраняется в таблице `Certificate`.
6. Gateway URL используется для открытия файла.

Если `PINATA_JWT` не задан, система работает в demo-режиме и генерирует демонстрационный CID. Это удобно для локальной разработки, но production-проверка должна использовать настоящий Pinata/IPFS.

### Переменные

```env
PINATA_JWT=
PINATA_GATEWAY=
```

`PINATA_GATEWAY` - это домен gateway, а не API secret. Например:

```text
example.mypinata.cloud
```

## 14. Blockchain

Blockchain используется для фиксации контрольного хеша сертификата.

Смарт-контракт: `contracts/CertificateRegistry.sol`.

Сеть: Polygon Amoy.

### Контракт

Контракт хранит структуру:

```solidity
struct Certificate {
  bytes32 documentHash;
  string cid;
  uint256 timestamp;
  address issuer;
  bool exists;
}
```

Основные функции:

- `registerCertificate(bytes32 certificateId, bytes32 documentHash, string cid)`;
- `getCertificate(bytes32 certificateId)`;
- `isCertificateValid(bytes32 certificateId, bytes32 documentHash)`.

### Backend-интеграция

Файл: `server/src/services/blockchain.service.ts`.

Backend:

1. Формирует `certificateId` на основе номера сертификата.
2. Нормализует SHA-256 в `bytes32`.
3. Вызывает `registerCertificate`.
4. Ждет подтверждения транзакции.
5. Сохраняет `txHash`, `blockNumber`, `contract`.

При публичной проверке backend вызывает `getCertificate` и `isCertificateValid`.

### Переменные

```env
POLYGON_AMOY_RPC_URL=https://polygon-amoy.drpc.org
POLYGON_PRIVATE_KEY=
CERTIFICATE_CONTRACT_ADDRESS=
```

`POLYGON_PRIVATE_KEY` - приватный ключ кошелька, с которого backend отправляет транзакции. В production его нельзя публиковать, коммитить или передавать в frontend.

## 15. QR-коды

QR-код содержит публичную ссылку проверки.

Серверная генерация:

- `server/src/utils/qr.ts`;
- `qrcode.toDataURL`;
- результат сохраняется в `Certificate.qrCodeDataUrl`.

Клиентская работа с QR:

- `src/components/certificates/CertificateQr.tsx`;
- отображение QR;
- возможность скачать PNG;
- fallback-генерация, если QR не пришел с сервера.

Публичный путь проверки строится на основе `PUBLIC_APP_URL`.

## 16. Переменные окружения

Шаблон: `.env.example`.

Рабочий файл: `.env`.

`.env` не должен попадать в git.

### База данных

```env
POSTGRES_DB=vermeat
POSTGRES_USER=postgres
POSTGRES_PASSWORD=
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:password@localhost:5432/vermeat?schema=public
```

### API и авторизация

```env
JWT_SECRET=
JWT_EXPIRES_IN=7d
SERVER_PORT=4000
```

`JWT_SECRET` должен быть длинным случайным значением.

### Frontend/API

```env
CLIENT_ORIGIN=http://127.0.0.1:5173
PUBLIC_APP_URL=http://127.0.0.1:5173
VITE_API_URL=http://127.0.0.1:4000/api
```

### Docker

```env
API_PORT=4000
WEB_PORT=80
DOCKER_CLIENT_ORIGIN=http://localhost
DOCKER_PUBLIC_APP_URL=http://localhost
DOCKER_VITE_API_URL=/api
```

### Production TLS

```env
SERVER_NAME=vermeat.ru www.vermeat.ru
CERTBOT_DOMAIN=vermeat.ru
LETSENCRYPT_EMAIL=admin@example.com
NGINX_TEMPLATE=./nginx/templates/http.conf.template
```

После получения сертификата:

```env
NGINX_TEMPLATE=./nginx/templates/ssl.conf.template
```

## 17. Локальный запуск

### 1. Установка зависимостей

```powershell
npm.cmd install
```

### 2. Подготовка `.env`

```powershell
Copy-Item .env.example .env
```

Заполнить минимум:

- `DATABASE_URL`;
- `POSTGRES_PASSWORD`;
- `JWT_SECRET`;
- `CLIENT_ORIGIN`;
- `PUBLIC_APP_URL`;
- `VITE_API_URL`.

### 3. Запуск PostgreSQL через Docker

```powershell
docker compose up -d postgres
```

### 4. Prisma

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
```

Если нужны демо-данные:

```powershell
npx prisma db seed
```

### 5. Запуск backend

```powershell
npm.cmd run start:api
```

Проверка:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/health
```

### 6. Запуск frontend

```powershell
npm.cmd run dev
```

Frontend будет доступен по адресу:

```text
http://127.0.0.1:5173
```

## 18. Запуск через Docker Compose

Локальный контур:

```bash
docker compose up -d --build
```

Сервисы:

- `postgres`;
- `api`;
- `web`.

Проверка:

```bash
curl http://localhost/api/health
```

Production-контур:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Подробная инструкция по production-деплою находится в:

```text
docs/deployment.md
```

## 19. SSL и домен

Для первого запуска нужно использовать HTTP-шаблон:

```env
NGINX_TEMPLATE=./nginx/templates/http.conf.template
```

Получить сертификат:

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

После выпуска сертификата переключить шаблон:

```env
NGINX_TEMPLATE=./nginx/templates/ssl.conf.template
```

Пересоздать web:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate --no-deps web
```

## 20. Скрипты package.json

| Команда | Назначение |
| --- | --- |
| `npm run dev` | Запуск frontend dev-сервера |
| `npm run dev:api` | Запуск backend в watch-режиме |
| `npm run start:api` | Запуск backend |
| `npm run build` | TypeScript build + Vite production build |
| `npm run build:web` | Сборка web-части для Docker |
| `npm run server:typecheck` | TypeScript-проверка backend |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production-сборки |
| `npm run prisma:generate` | Генерация Prisma client |
| `npm run prisma:migrate` | Локальные миграции Prisma |
| `npm run prisma:deploy` | Production-применение миграций |
| `npm run prisma:studio` | Prisma Studio |
| `npm run hardhat:compile` | Компиляция Solidity |
| `npm run hardhat:test` | Тесты смарт-контракта |
| `npm run hardhat:deploy:amoy` | Деплой контракта в Polygon Amoy |

## 21. Проверки качества

Перед коммитом желательно выполнять:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run server:typecheck
```

Для смарт-контракта:

```powershell
npm.cmd run hardhat:compile
npm.cmd run hardhat:test
```

## 22. Безопасность

Реализовано:

- пароли хранятся только в виде bcrypt-хеша;
- JWT используется для авторизации;
- роли разграничивают доступ к маршрутам;
- поставщик может создавать партии и сертификаты только от своего имени;
- администратор не имеет доступа к кабинету поставщика;
- 2FA включена для поставщиков;
- 2FA-коды хранятся в базе только в хешированном виде;
- срок действия 2FA-кода ограничен;
- количество попыток ввода 2FA-кода ограничено;
- CORS ограничен списком разрешенных origin;
- `.env` не должен попадать в репозиторий;
- критичные действия пишутся в `AuditLog`.

Нужно учитывать:

- приватный ключ Polygon нельзя хранить в публичном репозитории;
- `JWT_SECRET` должен быть уникальным для production;
- demo-аккаунты после деплоя нужно заменить или отключить seed;
- file-режим 2FA подходит только для локальной разработки;
- production должен использовать HTTPS.

## 23. Журнал аудита

Журнал аудита сохраняет:

- регистрацию пользователя;
- вход пользователя;
- ошибки 2FA;
- создание партии;
- загрузку сертификата;
- изменение статуса сертификата;
- удаление сертификата;
- публичную проверку;
- неуспешную проверку;
- изменение статуса поставщика.

Журнал доступен администратору на странице:

```text
/admin/logs
```

## 24. Страница состояния системы

Страница `/admin/status` показывает состояние:

- базы данных;
- email-отправки;
- IPFS;
- blockchain;
- приложения.

Эта страница нужна для быстрой диагностики после деплоя и при демонстрации проекта.

## 25. Резервное копирование PostgreSQL

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

Если используются другие `POSTGRES_USER` или `POSTGRES_DB`, заменить значения в команде.

## 26. Типовые проблемы

### API возвращает CORS 403

Проверить:

- `CLIENT_ORIGIN`;
- `PUBLIC_APP_URL`;
- домен с `www` и без `www`;
- что frontend открыт с того же origin, который разрешен backend.

### HTTPS не работает

Проверить:

- открыт ли порт `443`;
- получен ли сертификат Let's Encrypt;
- используется ли `ssl.conf.template`;
- есть ли volume `letsencrypt`;
- что `docker compose config` показывает правильный Nginx template.

### 2FA-коды не приходят

Проверить:

- `TWO_FACTOR_EMAIL_PROVIDER`;
- `EMAIL_FROM`;
- `SMTP_HOST`;
- `SMTP_PORT`;
- `SMTP_USER`;
- `SMTP_PASSWORD`;
- статус домена у email-провайдера;
- логи API.

Для file-режима коды пишутся в:

```text
server/email-outbox/2fa-codes.txt
```

### IPFS работает в demo-режиме

Причина: не задан `PINATA_JWT`.

Решение: заполнить:

```env
PINATA_JWT=
PINATA_GATEWAY=
```

### Blockchain работает в demo-режиме

Причина: не заполнены переменные Polygon.

Решение: заполнить:

```env
POLYGON_AMOY_RPC_URL=
POLYGON_PRIVATE_KEY=
CERTIFICATE_CONTRACT_ADDRESS=
```

### Ошибка записи в Polygon Amoy

Проверить:

- есть ли тестовые POL на кошельке;
- правильный ли RPC URL;
- правильный ли адрес контракта;
- не был ли сертификат уже зарегистрирован;
- не истек ли лимит RPC-провайдера.

## 27. Production checklist

Перед деплоем:

- [ ] `.env` заполнен production-значениями;
- [ ] `JWT_SECRET` заменен на длинный случайный секрет;
- [ ] `POSTGRES_PASSWORD` заменен;
- [ ] `PUBLIC_APP_URL` указывает на HTTPS-домен;
- [ ] `CLIENT_ORIGIN` указывает на HTTPS-домен;
- [ ] DNS домена указывает на сервер;
- [ ] открыты порты `80` и `443`;
- [ ] выпущен TLS-сертификат;
- [ ] `NGINX_TEMPLATE` переключен на `ssl.conf.template`;
- [ ] настроен SMTP или другой email-провайдер;
- [ ] настроен Pinata/IPFS;
- [ ] развернут смарт-контракт;
- [ ] указан `CERTIFICATE_CONTRACT_ADDRESS`;
- [ ] выполнены миграции;
- [ ] проверен `/api/health`;
- [ ] проверен полный сценарий поставщика;
- [ ] проверена публичная QR-проверка;
- [ ] проверен dashboard администратора.

## 28. Ограничения текущей версии

- Проект является дипломным прототипом, а не промышленной системой.
- Нет полноценного rate limiting для публичных запросов и входа.
- Нет автоматического backup-регламента внутри приложения.
- Удаление сертификата администратором пока физическое, в дальнейшем лучше заменить на аннулирование.
- Нет отдельной роли аудитора или оператора.
- Нет импорта партий из CSV/XLSX.
- Нет production-мониторинга с метриками и алертами.
- Основная blockchain-интеграция настроена на тестовую сеть Polygon Amoy.

## 29. Рекомендуемые дальнейшие улучшения

1. Добавить rate limiting для `/api/auth/login`, `/api/auth/login/2fa` и `/api/public/verify`.
2. Заменить удаление сертификата на аннулирование с причиной.
3. Добавить историю изменений сертификата.
4. Добавить экспорт QR-этикеток в PDF/PNG.
5. Добавить детальную страницу партии.
6. Добавить фильтры в журнал аудита.
7. Добавить автоматические интеграционные тесты API.
8. Добавить резервное копирование PostgreSQL по расписанию.
9. Добавить production-мониторинг.
10. Подготовить миграцию с Polygon Amoy на основную сеть или корпоративную сеть при необходимости.

## 30. Краткий порядок демонстрации проекта

1. Открыть главную страницу.
2. Показать страницу "О проекте".
3. Зарегистрировать или открыть поставщика.
4. Выполнить вход поставщика с 2FA.
5. Создать партию боргойской баранины.
6. Загрузить сертификат.
7. Показать SHA-256, IPFS CID, tx hash и QR-код.
8. Открыть публичную проверку.
9. Показать результат проверки.
10. Войти администратором.
11. Показать dashboard, реестр, поставщиков, журнал аудита и состояние системы.

