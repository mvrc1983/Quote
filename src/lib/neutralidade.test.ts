import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TEXT = new Set([".ts", ".tsx", ".json", ".md", ".csv", ".html", ".css", ".svg"]);
const SKIP = new Set(["node_modules", "dist", ".git", "public/fonts"]);

// Montadas em partes para este arquivo não conter as marcas que ele procura.
const banned = ["val" + "group", "lor" + "ena", "ind" + "igo", "sp" + "9", "tinta " + "hp", "tinta" + "hp"];

function collect(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(root, full);
    if (SKIP.has(entry) || SKIP.has(rel)) continue;
    if (statSync(full).isDirectory()) collect(full, out);
    else if (TEXT.has(extname(entry))) out.push(rel);
  }
  return out;
}

describe("neutralidade da marca", () => {
  it("não deixa dados da empresa de origem no código", () => {
    const hits: string[] = [];
    for (const rel of collect(root)) {
      const text = readFileSync(join(root, rel), "utf8").toLowerCase();
      for (const needle of banned) {
        if (text.includes(needle)) hits.push(`${rel}: ${needle}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
