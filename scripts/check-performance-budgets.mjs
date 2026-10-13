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
  const assignment = source
    .split(/\r?\n/)
    .find((line) => line.includes(" = {") && line.includes("entryJSFiles"));
  if (!assignment) throw new Error(`Unable to parse ${relativePath}`);
  return JSON.parse(assignment.slice(assignment.indexOf(" = ") + 3).replace(/;$/, ""));
}

async function entrySize(chunks) {
  let rawBytes = 0;
  let gzipBytes = 0;
  for (const chunk of new Set(chunks)) {
    const filePath = path.join(ROOT, ".next", chunk.replaceAll("/", path.sep));
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
  const entry = Object.entries(manifest.entryJSFiles).find(([name]) =>
    name.endsWith(target.suffix),
  );
  if (!entry) throw new Error(`Entry not found: ${target.suffix}`);
  const size = await entrySize(entry[1]);
  const status = size.gzipKb <= target.budgetKb ? "PASS" : "FAIL";
  if (status === "FAIL") failed = true;
  console.log(
    `${status} ${target.suffix}: ${size.gzipKb.toFixed(1)} KB gzip (${size.rawKb.toFixed(1)} KB raw), budget ${target.budgetKb} KB`,
  );
}

if (failed) process.exitCode = 1;
