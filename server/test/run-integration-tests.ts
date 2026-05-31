import "dotenv/config";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

const defaultDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:5432/vermeat?schema=public";

function getDatabaseName(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const databaseName = decodeURIComponent(url.pathname.slice(1));

  if (!databaseName) {
    throw new Error("В DATABASE_URL не указано имя базы данных");
  }

  return databaseName;
}

function getTestDatabaseUrl() {
  const explicitTestUrl = process.env["TEST_DATABASE_URL"];
  const sourceUrl =
    explicitTestUrl ?? process.env["DATABASE_URL"] ?? defaultDatabaseUrl;
  const url = new URL(sourceUrl);
  const sourceDatabaseName = getDatabaseName(sourceUrl);
  const testDatabaseName = explicitTestUrl
    ? sourceDatabaseName
    : sourceDatabaseName.endsWith("_test")
      ? sourceDatabaseName
      : `${sourceDatabaseName}_test`;

  if (!/^[a-zA-Z0-9_-]+_test$/.test(testDatabaseName)) {
    throw new Error(
      "Интеграционные тесты разрешено запускать только на базе с суффиксом _test"
    );
  }

  url.pathname = `/${testDatabaseName}`;

  return url.toString();
}

async function ensureTestDatabase(testDatabaseUrl: string) {
  const testDatabaseName = getDatabaseName(testDatabaseUrl);
  const adminUrl = new URL(testDatabaseUrl);

  adminUrl.pathname = "/postgres";
  adminUrl.searchParams.delete("schema");

  const client = new Client({ connectionString: adminUrl.toString() });

  await client.connect();

  try {
    const existingDatabase = await client.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
      [testDatabaseName]
    );

    if (!existingDatabase.rows[0]?.exists) {
      await client.query(`CREATE DATABASE "${testDatabaseName}"`);
      console.log(`Создана тестовая база данных ${testDatabaseName}`);
    }
  } finally {
    await client.end();
  }
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `Команда завершилась с кодом ${result.status}: ${command} ${args.join(" ")}`
    );
  }
}

async function main() {
  const testDatabaseUrl = getTestDatabaseUrl();
  const testEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: testDatabaseUrl,
    JWT_SECRET: "integration-test-secret-change-me",
    JWT_EXPIRES_IN: "1h",
    RATE_LIMIT_LOGIN_MAX: "4",
    RATE_LIMIT_LOGIN_WINDOW_MS: "60000",
    RATE_LIMIT_TWO_FACTOR_MAX: "3",
    RATE_LIMIT_TWO_FACTOR_WINDOW_MS: "60000",
    RATE_LIMIT_PUBLIC_VERIFY_MAX: "4",
    RATE_LIMIT_PUBLIC_VERIFY_WINDOW_MS: "60000",
    CLIENT_ORIGIN: "http://127.0.0.1:5173",
    PUBLIC_APP_URL: "http://127.0.0.1:5173",
    INTEGRATION_MODE: "demo",
    TWO_FACTOR_EMAIL_PROVIDER: "file",
    PINATA_JWT: "",
    PINATA_GATEWAY: "",
    POLYGON_AMOY_RPC_URL: "",
    POLYGON_PRIVATE_KEY: "",
    CERTIFICATE_CONTRACT_ADDRESS: "",
  };

  await ensureTestDatabase(testDatabaseUrl);
  run(
    process.execPath,
    [
      path.join(process.cwd(), "node_modules", "prisma", "build", "index.js"),
      "migrate",
      "deploy",
    ],
    testEnv
  );
  run(
    process.execPath,
    ["--import", "tsx", "--test", "server/test/api.integration.test.ts"],
    testEnv
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
