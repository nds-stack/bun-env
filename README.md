# @nds-stack/bun-env

> Environment variable loader & validator for Bun — schema-based, type coercion, zero dependencies.

[![npm version](https://img.shields.io/npm/v/%40nds-stack%2Fbun-env?color=blue&logo=npm)](https://www.npmjs.com/package/@nds-stack/bun-env)
[![Bun](https://img.shields.io/badge/Bun-%3E%3D1.3.0-black?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Why bun-env

Bun automatically loads `.env` files into `Bun.env`, but all values are **strings**. Every project reinvents the same boilerplate:

```typescript
const port = parseInt(Bun.env.PORT || "3000", 10);
const debug = Bun.env.DEBUG === "true";
if (!Bun.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
```

bun-env replaces this with a declarative schema:

```typescript
import { env } from "@nds-stack/bun-env";

const config = env({
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: { type: "url", required: true },
  DEBUG: { type: "boolean", default: false },
});

console.log(config.PORT); // number (3000), not string
```

---

## Installation

```bash
bun add @nds-stack/bun-env
```

---

## Quick Start

```typescript
import { env } from "@nds-stack/bun-env";

const config = env({
  NODE_ENV: { type: "enum", values: ["development", "production", "test"], default: "development" },
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: { type: "url", required: true },
  REDIS_URL: { type: "url", default: "redis://localhost:6379" },
  LOG_LEVEL: { type: "enum", values: ["debug", "info", "warn", "error"], default: "info" },
  MAX_CONNECTIONS: { type: "number", default: 100 },
  ENABLE_METRICS: { type: "boolean", default: false },
});

// All values are properly typed
console.log(config.PORT);          // number
console.log(config.DEBUG);         // boolean
console.log(config.DATABASE_URL);  // string (validated URL)
```

---

## API

### `env(schema)`

```typescript
function env<T extends EnvSchema>(schema: T): EnvResult<T>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `EnvSchema` | A record of key → schema entry definitions |

**Returns:** A typed object where each key has the coerced type based on the schema entry.

**Throws:** `BunEnvError` with aggregated error messages if validation fails.

### Schema Entry

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | `EnvType` | — | One of: `string`, `number`, `boolean`, `port`, `url`, `host`, `enum` |
| `required` | `boolean` | `false` | If `true`, throws when the variable is missing |
| `default` | `T` | — | Fallback value when the variable is not set. Not used when `required: true`. |
| `values` | `string[]` | — | Allowed values for `enum` type |
| `description` | `string` | — | Human-readable description, included in error messages |

### Type Behaviors

| Type | Input Example | Output | Validation |
|------|--------------|--------|------------|
| `string` | any text | string | None |
| `number` | `"3000"`, `"0.5"`, `"-1"` | number | Must be finite (`Number.isFinite`) |
| `boolean` | `"true"`, `"1"`, `"yes"`, `"false"`, `"0"`, `"no"` | boolean | Must match truthy/falsy patterns |
| `port` | `"5432"` | number | Integer 1–65535 |
| `url` | `"https://api.example.com"` | string | Must parse as `http://` or `https://` URL |
| `host` | `"localhost"`, `"192.168.1.1"` | string | Must match `^[\w.-]+$` |
| `enum` | `"debug"` | string | Must be in `values` array |

---

## How It Works

### Resolution Order

1. Read from `Bun.env[key]`
2. If `undefined` or `""` → if `required: true`, throw error; otherwise use `default`
3. If value exists → coerce based on `type`, throw on invalid format

### Error Aggregation

All schema entries are validated **before** throwing. If multiple variables fail validation, you get a single error with all failures:

```
Environment validation failed with 2 error(s):
  - DATABASE_URL: Expected a valid URL, got "not-a-url"
  - PORT: Expected a valid port (1-65535), got "0"
```

This means you can fix ALL issues at once instead of fixing, re-running, failing again.

### Zero Runtime Overhead

After `env()` runs once at startup, the result is a plain object with no getter/setter overhead. The function itself is designed for single-use at application bootstrap.

---

## Limitations

- **Startup only** — `env()` is designed to run once at process startup. It reads `Bun.env` at call time, not lazily.
- **No hot reload** — Changing `Bun.env` at runtime after calling `env()` has no effect. Restart the process to pick up changes.
- **Bun only** — depends on `Bun.env`. Use `dotenv` + `envalid` for Node.js.
- **No nested config** — flat key-value only. For nested configuration objects, use `@nds-stack/bun-config` (planned).
- **No custom validators** — only built-in types are supported. For custom validation, validate the result after `env()` returns.
- **All-or-nothing** — if any required variable fails, the entire function throws. Partial results are not returned.

---

## Benchmarks

```
Bun 1.3.13, 10000 iterations x 3 samples

Operation              | Throughput
-----------------------|-------------
string coercion        | 6.2M ops/s
number coercion        | 5.1M ops/s
boolean coercion       | 5.8M ops/s
full schema (4 keys)   | 2.0M ops/s
```

At ~2M schema validations per second, bun-env adds negligible startup time.

---

## Comparison Table

| Feature | Manual `Bun.env` | `envalid` (Node) | `zod` (Node) | bun-env |
|---------|-----------------|-------------------|--------------|---------|
| Type coercion | ❌ Manual | ✅ | ✅ | ✅ |
| Schema validation | ❌ | ✅ | ✅ | ✅ |
| Bun-native | ✅ | ❌ Polyfills | ❌ Polyfills | ✅ |
| Zero dependencies | ✅ | ❌ 2+ deps | ❌ 5+ deps | ✅ |
| Bundle size | 0KB | ~8KB + deps | ~20KB + deps | **~1.5KB** |
| Error aggregation | ❌ | ✅ | ❌ | ✅ |
| Port/URL/Host types | ❌ | ⚠️ Partial | ❌ | ✅ |
| Node.js support | ❌ | ✅ | ✅ | ❌ |

---

## License

MIT
