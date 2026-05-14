import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const currentDir = dirname(fileURLToPath(import.meta.url));
const envFilePaths = [resolve(currentDir, "../../.env"), resolve(currentDir, ".env")];

for (const envFilePath of envFilePaths) {
  if (existsSync(envFilePath)) {
    loadEnv({ path: envFilePath, override: false });
  }
}

const resolveDatasourceUrl = (): string =>
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/monitor";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    // Prisma 7 requires a datasource URL in config even for code generation.
    url: resolveDatasourceUrl()
  }
});
