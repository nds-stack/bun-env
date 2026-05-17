import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { env } from "../src/index.ts";

describe("bun-env", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...Bun.env };
  });

  afterEach(() => {
    for (const key of Object.keys(Bun.env)) {
      if (!(key in originalEnv)) {
        delete (Bun.env as Record<string, string | undefined>)[key];
      }
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      (Bun.env as Record<string, string | undefined>)[key] = value;
    }
  });
  test("returns string value", () => {
    const config = env({ MY_VAR: { type: "string", default: "fallback" } });
    expect(config.MY_VAR).toBe("fallback");
  });

  test("reads from Bun.env", () => {
    Bun.env.TEST_VAR = "hello";
    const config = env({ TEST_VAR: { type: "string" } });
    expect(config.TEST_VAR).toBe("hello");
  });

  test("coerces number", () => {
    Bun.env.TEST_PORT = "3000";
    const config = env({ TEST_PORT: { type: "number" } });
    expect(config.TEST_PORT).toBe(3000);
  });

  test("coerces boolean true", () => {
    Bun.env.TEST_BOOL = "true";
    const config = env({ TEST_BOOL: { type: "boolean" } });
    expect(config.TEST_BOOL).toBe(true);
  });

  test("coerces boolean false", () => {
    Bun.env.TEST_BOOL = "0";
    const config = env({ TEST_BOOL: { type: "boolean" } });
    expect(config.TEST_BOOL).toBe(false);
  });

  test("port validates range", () => {
    Bun.env.TEST_PORT = "99999";
    expect(() => env({ TEST_PORT: { type: "port" } })).toThrow();
  });

  test("port accepts valid range", () => {
    Bun.env.TEST_PORT = "5432";
    const config = env({ TEST_PORT: { type: "port" } });
    expect(config.TEST_PORT).toBe(5432);
  });

  test("url validates format", () => {
    Bun.env.TEST_URL = "not-a-url";
    expect(() => env({ TEST_URL: { type: "url" } })).toThrow();
  });

  test("url accepts valid", () => {
    Bun.env.TEST_URL = "https://api.example.com";
    const config = env({ TEST_URL: { type: "url" } });
    expect(config.TEST_URL).toBe("https://api.example.com");
  });

  test("host validates format", () => {
    Bun.env.TEST_HOST = "localhost";
    const config = env({ TEST_HOST: { type: "host" } });
    expect(config.TEST_HOST).toBe("localhost");
  });

  test("enum validates values", () => {
    Bun.env.TEST_ENUM = "debug";
    const config = env({ TEST_ENUM: { type: "enum", values: ["debug", "info", "error"] } });
    expect(config.TEST_ENUM).toBe("debug");
  });

  test("enum rejects invalid", () => {
    Bun.env.TEST_ENUM = "critical";
    expect(() => env({ TEST_ENUM: { type: "enum", values: ["debug", "info", "error"] } })).toThrow();
  });

  test("required throws when missing", () => {
    delete Bun.env.MUST_EXIST;
    expect(() => env({ MUST_EXIST: { type: "string", required: true } })).toThrow();
  });

  test("required accepts when present", () => {
    Bun.env.MUST_EXIST = "yes";
    const config = env({ MUST_EXIST: { type: "string", required: true } });
    expect(config.MUST_EXIST).toBe("yes");
  });

  test("default is used when missing", () => {
    delete Bun.env.NOT_SET;
    const config = env({ NOT_SET: { type: "number", default: 42 } });
    expect(config.NOT_SET).toBe(42);
  });

  test("mixed schema validates all", () => {
    Bun.env.DB_PORT = "5432";
    Bun.env.DB_HOST = "localhost";
    Bun.env.DEBUG = "true";

    const config = env({
      DB_PORT: { type: "port", default: 5432 },
      DB_HOST: { type: "host", default: "localhost" },
      DEBUG: { type: "boolean", default: false },
      LOG_LEVEL: { type: "enum", values: ["debug", "info", "warn", "error"], default: "info" },
    });

    expect(config.DB_PORT).toBe(5432);
    expect(config.DB_HOST).toBe("localhost");
    expect(config.DEBUG).toBe(true);
    expect(config.LOG_LEVEL).toBe("info");
  });

  test("throws aggregated errors", () => {
    delete Bun.env.MISSING_A;
    delete Bun.env.MISSING_B;

    try {
      env({
        MISSING_A: { type: "string", required: true },
        MISSING_B: { type: "string", required: true },
      });
      expect.unreachable();
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("MISSING_A");
      expect(msg).toContain("MISSING_B");
      expect(msg).toContain("2 error(s)");
    }
  });
});
