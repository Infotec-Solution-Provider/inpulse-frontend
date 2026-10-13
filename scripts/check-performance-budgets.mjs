import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = process.cwd();
const ENTRIES = [
  { suffix: "/(private)/[instance]/layout", budgetKb: 180 },
  { suffix: "/(private)/[instance]/(main)/page", budgetKb: 355 },
  { suffix: "/(private)/[instance]/monitor/page", budgetKb: 335 },
];

async function readManifest(relativePath) {
  const source = await readFile(path.join(ROOT, relativePath), "utf8");
  const assignment = source.match(
    /__RSC_MANIFEST\["(?:\\.|[^"\\])*"\]\s*=\s*(\{[\s\S]*\})\s*;?\s*$/,
  );
  if (!assignment) throw new Error(`Unable to parse ${relativePath}`);
  return JSON.parse(assignment[1]);
}

async function entrySize(chunks) {
  let rawBytes = 0;
  let gzipBytes = 0;
  for (const chunk of new Set(chunks)) {
    const filePath = path.join(ROOT, ".next", decodeURIComponent(chunk).replaceAll("/", path.sep));
    rawBytes += (await stat(filePath)).size;
    gzipBytes += gzipSync(await readFile(filePath)).byteLength;
  }
  return { rawKb: rawBytes / 1024, gzipKb: gzipBytes / 1024 };
}

let failed = false;
for (const target of ENTRIES) {
  const manifestPath =
    target.suffix === "/(private)/[instance]/layout"
      ? ".next/server/app/(private)/[instance]/(main)/page_client-reference-manifest.js"
      : `.next/server/app${target.suffix}_client-reference-manifest.js`;
  const manifest = await readManifest(manifestPath);
  const entry = manifest.entryJSFiles
    ? Object.entries(manifest.entryJSFiles).find(([name]) => name.endsWith(target.suffix))?.[1]
    : Object.entries(manifest.clientModules)
        .find(([name]) => name.replaceAll("\\", "/").endsWith(`${target.suffix}.tsx`))?.[1]
        .chunks.filter((chunk) => chunk.startsWith("static/") && chunk.endsWith(".js"));
  if (!entry) throw new Error(`Entry not found: ${target.suffix}`);
  const size = await entrySize(entry);
  const status = size.gzipKb <= target.budgetKb ? "PASS" : "FAIL";
  if (status === "FAIL") failed = true;
  console.log(
    `${status} ${target.suffix}: ${size.gzipKb.toFixed(1)} KB gzip (${size.rawKb.toFixed(1)} KB raw), budget ${target.budgetKb} KB`,
  );
}

if (failed) process.exitCode = 1;
