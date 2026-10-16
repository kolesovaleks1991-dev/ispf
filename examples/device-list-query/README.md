# Query catalog example: device list

Cross-object **Object Query (OQ)** under `root.platform.queries` that returns every **DEVICE** under `root.platform.devices.*` with `path`, `displayName`, and `type`.

One catalog child = one query definition. This example uses the conventional function name **`run`**.

Related: [ADR-0044 Object Query](../../docs/en/decisions/0044-object-query.md).

## Files

| File | Purpose |
|------|---------|
| `device-list-oq.spec.json` | Human-readable OQ spec (same as in `run.sourceBody`) |
| `run.descriptor.json` | Function descriptor (`sourceType: object-query`) |
| `install.mjs` | Create query object, upsert `run`, smoke-invoke |

## Install (local server)

```bash
node examples/device-list-query/install.mjs
```

Environment (optional):

| Variable | Default |
|----------|---------|
| `ISPF_URL` | `http://127.0.0.1:8080` |
| `ISPF_USER` / `ISPF_PASSWORD` | `admin` / `admin` |
| `ISPF_QUERIES_PARENT` | `root.platform.queries` |
| `ISPF_QUERY_NAME` | `device-list` |

Result path: `root.platform.queries.device-list`, function `run`.

## Manual (Web Console)

1. Open **Queries** → **Create query**, name `device-list`.
2. **Functions** → edit **`run`** → Object Query spec (or paste from `device-list-oq.spec.json`).
3. **Invoke** on `run` — output field **`rows`** is a JSON string; **`rowCount`** is the number of devices.

To scan a subtree only, change `sourcePathPattern`, e.g. `root.platform.devices.plant-a.*`.

## Invoke (HTTP)

```http
POST /api/v1/objects/by-path/functions/invoke?path=root.platform.queries.device-list&name=run
Content-Type: application/json
Authorization: Bearer …

{
  "schema": {
    "name": "objectQueryInput",
    "fields": [{ "name": "patch", "type": "STRING" }]
  },
  "rows": [{}]
}
```

Response row (function output): `rows` (JSON array string), `rowCount` (integer).

## Use elsewhere

- **Dashboard function widget:** `objectPath` = `root.platform.queries.device-list`, `functionName` = `run`.
- **CEL (inline spec):** `queryRows('{"from":{"sourcePathPattern":"root.platform.devices.*",…}}')` — same scan without a catalog object; the catalog entry is for reuse and discoverability.
- **KPI binding:** `queryScalar(<spec-or-ref>, "count")` for device count only (see [bindings.md](../../docs/en/bindings.md)).

Script steps: `queryRows`, `for_each_row` on the same spec JSON.
