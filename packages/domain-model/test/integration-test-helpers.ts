const INTEGRATION_DATABASE_ENV_NAME = "PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL";
const DISPOSABLE_DATABASE_NAME_HINTS = ["test", "integration", "ci"] as const;

const extractDatabaseName = (connectionString: string): string => {
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new Error(
      `${INTEGRATION_DATABASE_ENV_NAME} must be a valid PostgreSQL connection string`
    );
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\/+/, ""));
  if (!databaseName) {
    throw new Error(
      `${INTEGRATION_DATABASE_ENV_NAME} must include an explicit disposable database name`
    );
  }

  return databaseName;
};

export const resolveIntegrationDatabaseUrl = (rawValue: string | undefined): string => {
  const connectionString = rawValue?.trim() ?? "";
  if (!connectionString) {
    return "";
  }

  const databaseName = extractDatabaseName(connectionString).toLowerCase();
  const isDisposableDatabase = DISPOSABLE_DATABASE_NAME_HINTS.some((hint) =>
    databaseName.includes(hint)
  );
  if (!isDisposableDatabase) {
    throw new Error(
      `${INTEGRATION_DATABASE_ENV_NAME} must point to a disposable database whose name includes one of: ${DISPOSABLE_DATABASE_NAME_HINTS.join(", ")}`
    );
  }

  return connectionString;
};
