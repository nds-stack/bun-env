import type { EnvSchema, EnvSchemaEntry, EnvResult, EnvError } from "./types/index.ts";
import { BunEnvError } from "./errors/bun-env-error.ts";

function coerce(raw: string | undefined, entry: EnvSchemaEntry): unknown {
  if (raw === undefined || raw === "") {
    if (entry.required) {
      throw new BunEnvError(
        `Missing required environment variable. ` +
        `Set \`${entry.description ?? "see schema"}\` in .env or export it.`,
      );
    }
    return entry.default;
  }

  switch (entry.type) {
    case "string": {
      return raw;
    }

    case "number": {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        throw new BunEnvError(
          `Expected a number, got "${raw}". ` +
          `Use a numeric value (e.g., 3000, 0.5, -1).`,
        );
      }
      return n;
    }

    case "boolean": {
      const lower = raw.toLowerCase();
      if (lower === "true" || lower === "1" || lower === "yes") return true;
      if (lower === "false" || lower === "0" || lower === "no") return false;
      throw new BunEnvError(
        `Expected a boolean, got "${raw}". ` +
        `Use true/false, 1/0, or yes/no.`,
      );
    }

    case "port": {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        throw new BunEnvError(
          `Expected a valid port (1-65535), got "${raw}".`,
        );
      }
      return n;
    }

    case "url": {
      try {
        const url = new URL(raw);
        if (!url.protocol.startsWith("http")) {
          throw new Error("not an HTTP URL");
        }
        return raw;
      } catch {
        throw new BunEnvError(
          `Expected a valid URL (http://... or https://...), got "${raw}".`,
        );
      }
    }

    case "host": {
      if (!/^[\w.-]+$/.test(raw)) {
        throw new BunEnvError(
          `Expected a valid hostname or IP, got "${raw}".`,
        );
      }
      return raw;
    }

    case "enum": {
      if (!entry.values || !entry.values.includes(raw)) {
        throw new BunEnvError(
          `Expected one of: ${entry.values?.join(", ") ?? "—"}, got "${raw}".`,
        );
      }
      return raw;
    }

    default:
      return raw;
  }
}

export function env<T extends EnvSchema>(schema: T): EnvResult<T> {
  const errors: EnvError[] = [];
  const result: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(schema)) {
    try {
      result[key] = coerce(Bun.env[key], entry);
    } catch (error) {
      if (error instanceof BunEnvError) {
        errors.push({ key, message: error.message });
      } else {
        errors.push({ key, message: String(error) });
      }
    }
  }

  if (errors.length > 0) {
    const detail = errors.map((e) => `  - ${e.key}: ${e.message}`).join("\n");
    throw new BunEnvError(
      `Environment validation failed with ${errors.length} error(s):\n${detail}`,
    );
  }

  return result as EnvResult<T>;
}
