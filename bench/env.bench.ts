#!/usr/bin/env bun
/* eslint-disable no-console */
import { env } from "../src/index.ts";

const iterations = 10_000;
const samples = 3;

function bench(fn: () => void): number {
  fn();
  const start = performance.now();
  for (let s = 0; s < samples; s++) fn();
  const elapsed = performance.now() - start;
  return Math.round((iterations * samples) / (elapsed / 1000));
}

// Pre-set env vars
Bun.env.BENCH_STRING = "hello";
Bun.env.BENCH_NUMBER = "3000";
Bun.env.BENCH_BOOL = "true";
Bun.env.BENCH_PORT = "5432";

const results: Array<{ name: string; ops: number }> = [];

results.push({
  name: "string coercion",
  ops: bench(() => {
    for (let i = 0; i < iterations; i++) env({ BENCH_STRING: { type: "string" } });
  }),
});

results.push({
  name: "number coercion",
  ops: bench(() => {
    for (let i = 0; i < iterations; i++) env({ BENCH_NUMBER: { type: "number" } });
  }),
});

results.push({
  name: "boolean coercion",
  ops: bench(() => {
    for (let i = 0; i < iterations; i++) env({ BENCH_BOOL: { type: "boolean" } });
  }),
});

results.push({
  name: "full schema (4 keys)",
  ops: bench(() => {
    for (let i = 0; i < iterations; i++) {
      env({
        BENCH_STRING: { type: "string" },
        BENCH_NUMBER: { type: "number" },
        BENCH_BOOL: { type: "boolean" },
        BENCH_PORT: { type: "port" },
      });
    }
  }),
});

const base = 2;
const pad = (s: string, n: number) => s.padEnd(n);
const opPad = results.reduce((m, r) => Math.max(m, r.name.length), 0);

console.log("--- bun-env Benchmark ---");
console.log(`Bun ${Bun.version}, ${iterations} iterations x ${samples} samples\n`);
console.log(`${pad("Operation", opPad + base)} | ${pad("Throughput", 14)}`);
console.log(`${"-".repeat(opPad + base)}-|-${"-".repeat(14)}`);

for (const r of results) {
  const ops = r.ops > 1_000_000
    ? `${(r.ops / 1_000_000).toFixed(1)}M ops/s`
    : `${(r.ops / 1_000).toFixed(0)}K ops/s`;
  console.log(`${pad(r.name, opPad + base)} | ${pad(ops, 14)}`);
}

console.log("");
