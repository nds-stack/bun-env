import type { EnvSchema, EnvSchemaEntry, EnvResult, EnvError } from "./types/index.ts";
import { BunEnvError } from "./errors/bun-env-error.ts";

function validateDefault(value: unknown, entry: EnvSchemaEntry): void {
  switch (entry.type) {
    case "number":
    case "port":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new BunEnvError(`Invalid default for ${entry.description ?? "env var"}: expected a number, got ${typeof value}`);
      }
      break;
    case "boolean":
      if (typeof value !== "boolean") {
        throw new BunEnvError(`Invalid default for ${entry.description ?? "env var"}: expected a boolean, got ${typeof value}`);
      }
      break;
    case "string":
      if (typeof value !== "string") {
        throw new BunEnvError(`Invalid default for ${entry.description ?? "env var"}: expected a string, got ${typeof value}`);
      }
      break;
    case "url":
      if (typeof value !== "string") {
        throw new BunEnvError(`Invalid default for ${entry.description ?? "env var"}: expected a string, got ${typeof value}`);
      }
      try { new URL(value); } catch {
        throw new BunEnvError(`Invalid default for ${entry.description ?? "env var"}: expected a valid URL, got "${value}"`);
      }
      break;
    case "host":
      if (typeof value !== "string" || !/^[\w.-]+$/.test(value)) {
        throw new BunEnvError(`Invalid default for ${entry.description ?? "env var"}: expected a valid hostname, got "${String(value)}"`);
      }
      break;
    case "enum":
      if (!entry.values?.includes(value as string)) {
        throw new BunEnvError(`Invalid default for ${entry.description ?? "env var"}: expected one of ${entry.values?.join(", ") ?? "—"}, got "${String(value)}"`);
      }
      break;
  }
}

function coerce(raw: unknown, entry: EnvSchemaEntry): unknown {
  if (raw == null || raw === "" || (typeof raw === "string" && raw.trim() === "")) {
    if (entry.required) {
      throw new BunEnvError("Required env var not set");
    }
    if (entry.default !== undefined) {
      validateDefault(entry.default, entry);
    }
    return entry.default;
  }

  const strVal = typeof raw === "string" ? raw.trim() : String(raw).trim();

  switch (entry.type) {
    case "string": {
      return strVal;
    }

    case "number": {
      if (!/^[+-]?\d+(\.\d+)?$/.test(strVal)) {
        throw new BunEnvError(
          `Expected a decimal number, got "${strVal}". Use plain decimal (e.g., 3000, 0.5, -1).`,
        );
      }
      const n = Number(strVal);
      if (!Number.isFinite(n)) {
        throw new BunEnvError(
          `Expected a number, got "${strVal}". Use a numeric value (e.g., 3000, 0.5, -1).`,
        );
      }
      return n;
    }

    case "boolean": {
      const lower = strVal.toLowerCase();
      if (lower === "true" || lower === "1" || lower === "yes") return true;
      if (lower === "false" || lower === "0" || lower === "no") return false;
      throw new BunEnvError(
        `Expected a boolean, got "${strVal}". Use true/false, 1/0, or yes/no.`,
      );
    }

    case "port": {
      const n = Number(strVal);
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        throw new BunEnvError(
          `Expected a valid port (1-65535), got "${strVal}".`,
        );
      }
      return n;
    }

    case "url": {
      try {
        const url = new URL(strVal);
        if (!url.protocol.startsWith("http")) {
          throw new Error("not an HTTP URL");
        }
        return strVal;
      } catch {
        throw new BunEnvError(
          `Expected a valid URL (http://... or https://...), got "${strVal}".`,
        );
      }
    }

    case "host": {
      if (!/^[\w.-]+$/.test(strVal)) {
        throw new BunEnvError(
          `Expected a valid hostname or IP, got "${strVal}".`,
        );
      }
      return strVal;
    }

    case "enum": {
      if (!entry.values?.includes(strVal)) {
        throw new BunEnvError(
          `Expected one of: ${entry.values?.join(", ") ?? "—"}, got "${strVal}".`,
        );
      }
      return strVal;
    }

    default:
      throw new BunEnvError(`Unknown type: ${entry.type}`);
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
