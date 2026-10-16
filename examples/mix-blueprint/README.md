# Mixin blueprint `mix` — `evaluateExpression` и `evaluateExpressionCel`

На `root.platform.mixin-blueprints.mix` две функции с **одинаковым** контрактом и логикой, обе на **CEL** (`sourceType: expression`):

| Input | Type | Description |
|-------|------|-------------|
| `a` | DOUBLE | First number |
| `b` | DOUBLE | Second number |
| `operator` | STRING | `+`, `-`, `*`, or `/` |

| Output | Type |
|--------|------|
| `result` | DOUBLE (unknown operator or `/` with `b == 0` → `0`) |

| Function | Файл дескриптора |
|----------|------------------|
| `evaluateExpression` | `evaluate-expression.descriptor.json` |
| `evaluateExpressionCel` | `evaluate-expression-cel.descriptor.json` (явное имя «CEL-версия») |

CEL (одинаковое в обоих):

```text
input.operator == "+" ? input.a + input.b : input.operator == "-" ? …
```

## Install

```bash
node examples/mix-blueprint/install-function.mjs
```

Environment: `ISPF_URL`, `ISPF_OBJECT_PATH`, `ISPF_USER`, `ISPF_PASSWORD` (см. скрипт).

## Invoke

```http
POST /api/v1/objects/by-path/functions/invoke?path=root.platform.mixin-blueprints.mix&name=evaluateExpressionCel
Content-Type: application/json

{
  "schema": {
    "name": "evaluateExpressionCelIn",
    "fields": [
      { "name": "a", "type": "DOUBLE" },
      { "name": "b", "type": "DOUBLE" },
      { "name": "operator", "type": "STRING" }
    ]
  },
  "rows": [{ "a": 6, "b": 3, "operator": "*" }]
}
```

Имя `evaluateExpression` — тот же payload, поле `name` в schema можно `evaluateExpressionIn`.

После mixin `mix` обе функции доступны на целевом объекте.
