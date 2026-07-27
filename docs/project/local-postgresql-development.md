# Local PostgreSQL Development

Start the local PostgreSQL 17 service with:

```bash
pnpm infra:up
```

The service listens on `localhost:5432` and initializes `monitor` for normal runtime and Prisma work plus `monitor_test` for real-Postgres integration tests. Its credentials and database names are configured through the `POSTGRES_*` values in `.env` (see `.env.example`). If you override them, update `DATABASE_URL`, `DIRECT_URL`, and `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL` to matching values; the Node integration runner does not expand `.env` references.

Check the service output with `pnpm infra:logs`, or stop it with `pnpm infra:down`. The database files persist in the Compose-managed `postgres-data` volume across stops and restarts.

Run the real-Postgres suite with:

```bash
pnpm --filter @monitor/domain-model run test:integration
```

The suite uses `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL` and drops/recreates only the `product_domain` schema in `monitor_test`. It does not use `monitor`.

Reset local database state with `pnpm infra:reset`. This removes the Compose-managed volume, so the next `pnpm infra:up` initializes both databases again.
