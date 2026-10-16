# getFamilies — script function on data source `cutoff`

Пример **script**-функции на том же external data source, что и bundle CutOff:

- **Data source:** `root.platform.data-sources.cutoff` (JDBC к вашей PostgreSQL, таблица `public.common_families`)
- **Объект по умолчанию:** `root.platform.singleton-blueprints.test1` (можно переопределить)

## Установка и проверка

```powershell
node examples/cutoff-common-families/install-function.mjs
```

Переменные окружения:

| Переменная | По умолчанию |
|------------|----------------|
| `ISPF_URL` | `http://127.0.0.1:8080` |
| `ISPF_OBJECT_PATH` | `root.platform.singleton-blueprints.test1` |
| `ISPF_USER` / `ISPF_PASSWORD` | `admin` / `admin` |

## Invoke вручную

```http
POST /api/v1/objects/by-path/functions/invoke?path=root.platform.singleton-blueprints.test1&name=getFamilies
Content-Type: application/json

{
  "rows": [{ "num": 10 }]
}
```

Поле `num` необязательно: без него используется лимит **100** (не больше **1000**).

## Скрипт (логика)

1. `selectMany` — SQL с `FROM public.common_families` и `LIMIT LEAST(COALESCE(?, 100), 1000)`.
2. `return` — `error_code` / `error_message` / `result` = `${rows}`.

Типичные ошибки:

- SQL без `FROM` (`SELECT id, family LIMIT ?`) — **500** на шаге SQL.
- На **external** data source script-шаги должны выполняться через JDBC этого data source (см. `FunctionScriptJdbcScope` в сервере); без этого `selectMany`/`exec` ходят в platform DB и падают.

После обновления сервера перезапустите `bootRun` / JAR и снова выполните `install-function.mjs`.
