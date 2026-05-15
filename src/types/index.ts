export type EnvType = "string" | "number" | "boolean" | "port" | "url" | "host" | "enum";

export interface EnvSchemaEntry<T = unknown> {
  type: EnvType;
  default?: T;
  required?: boolean;
  values?: readonly string[];
  description?: string;
}

export type EnvSchema = Record<string, EnvSchemaEntry>;

export type EnvResult<T extends EnvSchema> = {
  [K in keyof T]: T[K] extends EnvSchemaEntry<infer V>
    ? V
    : T[K] extends { type: "number" }
      ? number
      : T[K] extends { type: "boolean" }
        ? boolean
        : string;
};

export interface EnvError {
  key: string;
  message: string;
}
