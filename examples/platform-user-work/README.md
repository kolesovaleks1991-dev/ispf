# Platform user-work (replay bundle)

Снимок и скрипты для **воспроизведения конфигурации платформы**, которую вы настраивали в web-console / через API на локальном сервере. Код web-console и сервера лежит в ветке **`platform/user-work`** (включая PR [#559](https://github.com/iot-solutions-ru/ispf/pull/559)).

## Что входит

| Объект / артеfact | Путь | Как воспроизвести |
|-------------------|------|-------------------|
| Handler demo device | `root.platform.devices.handler-demo-01` | `install-handler-demo.mjs` |
| Dashboard | `root.platform.dashboards.handler-demo-coordinates` | `install-dashboard-coordinates.mjs` + `fixtures/handler-demo-coordinates.dashboard.json` |
| SQL binding | `root.platform.bindings.testBinding` | `../configure-testBinding.mjs` |
| Mixin functions | `root.platform.mixin-blueprints.mix` | `../mix-blueprint/install-function.mjs` |
| Object query | `root.platform.queries.device-list` | `../device-list-query/install.mjs` |
| getFamilies script | `root.platform.singleton-blueprints.test1` | `../cutoff-common-families/install-function.mjs` |
| CutOff bundle (optional) | `root.platform.devices.cutoff`, dashboards | `../cutoff/install.mjs` + `CUTOFF_DIR` |
| External JDBC | `root.platform.data-sources.cutoff` | вручную; образец полей — `fixtures/cutoff.data-source.redacted.json` |

## Быстрый старт

```bash
node examples/platform-user-work/install-all.mjs
```

Переменные: `ISPF_URL` (по умолчанию `http://127.0.0.1:8080`), `ISPF_USER`, `ISPF_PASSWORD`.

## Web-console изменения (git)

На той же ветке: binding expression help, object-table column editor, навигация «Свойства ↔ Редактор» для платформенных каталогов, Windows dev-скрипты.

## Не в git

- Секреты JDBC (`connectionString`, пароли) — только redacted fixture.
- Сгенерированные `ai/context/.../context-pack.json` — локальные артеfacts агента, в эту ветку не включены.
