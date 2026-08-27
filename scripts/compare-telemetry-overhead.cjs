const { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const workspace = path.resolve(__dirname, "..");

function positiveNumber(name, fallback, { integer = false } = {}) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
    throw new Error(`${name} must be a positive${integer ? " integer" : " number"}`);
  }
  return value;
}

const chatCount = positiveNumber("PERF_CHAT_COUNT", "500", { integer: true });
const cpuRate = positiveNumber("PERF_CPU_RATE", "4");
const runs = positiveNumber("PERF_AB_RUNS", "3", { integer: true });

function resolvePnpmInvocation() {
  if (process.platform !== "win32") return { command: "pnpm", prefix: [] };
  const roots = [process.env.PNPM_HOME, process.env.APPDATA && path.join(process.env.APPDATA, "npm")]
    .filter(Boolean);
  for (const root of roots) {
    const entrypoint = path.join(root, "node_modules", "pnpm", "bin", "pnpm.mjs");
    if (existsSync(entrypoint)) return { command: process.execPath, prefix: [entrypoint] };
  }
  return { command: "pnpm.cmd", prefix: [], shell: true };
}

const packageManager = resolvePnpmInvocation();

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function runPnpm(args, env) {
  const result = spawnSync(packageManager.command, [...packageManager.prefix, ...args], {
    cwd: workspace,
    env: { ...process.env, ...env },
    shell: packageManager.shell === true,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed with exit code ${result.status}`);
  }
  return result;
}

if (process.env.PERF_SKIP_BUILD !== "true") {
  runPnpm(["build"], {});
}

function runVariant(enabled) {
  const label = enabled ? "on" : "off";
  const metricsPath = path.join(
    workspace,
    ".performance-artifacts",
    "metrics",
    `chats-${chatCount}-cpu-${cpuRate}-telemetry-${label}`,
    "performance-metrics.json",
  );
  if (existsSync(metricsPath)) unlinkSync(metricsPath);

  runPnpm(
    [
      "exec",
      "playwright",
      "test",
      "tests/performance.spec.ts",
      "--project=chromium-performance",
      "--grep=evento-render p95",
    ],
    {
      PERF_CHAT_COUNT: chatCount,
      PERF_CPU_RATE: cpuRate,
      PERF_TELEMETRY_ENABLED: String(enabled),
    },
  );
  if (!existsSync(metricsPath)) {
    throw new Error(`Performance metrics were not generated for telemetry ${label}`);
  }
  return JSON.parse(readFileSync(metricsPath, "utf8"));
}

const results = { on: [], off: [] };
for (let index = 0; index < runs; index += 1) {
  const order = index % 2 === 0 ? [false, true] : [true, false];
  for (const enabled of order) results[enabled ? "on" : "off"].push(runVariant(enabled));
}

const offP75 = median(results.off.map(({ p75 }) => p75));
const onP75 = median(results.on.map(({ p75 }) => p75));
const regressionPercent = offP75 === 0 ? Number.POSITIVE_INFINITY : (onP75 / offP75 - 1) * 100;
const offStartupDuration = median(results.off.map(({ startupDuration }) => startupDuration));
const onStartupDuration = median(results.on.map(({ startupDuration }) => startupDuration));
const startupRegressionPercent = offStartupDuration === 0
  ? Number.POSITIVE_INFINITY
  : (onStartupDuration / offStartupDuration - 1) * 100;
const offLongTaskTime = median(results.off.map(({ totalLongTaskTime }) => totalLongTaskTime));
const onLongTaskTime = median(results.on.map(({ totalLongTaskTime }) => totalLongTaskTime));
const onFlushRoundTripDuration = median(
  results.on.map(({ flushRoundTripDuration }) => flushRoundTripDuration),
);
const telemetryFlushSucceeded = results.on.every(({ telemetryBatchCount }) => telemetryBatchCount > 0);
const createsLongTasks =
  offLongTaskTime === 0 ? onLongTaskTime > 0 : onLongTaskTime > offLongTaskTime * 1.03;

const summary = {
  generatedAt: new Date().toISOString(),
  buildId: process.env.NEXT_PUBLIC_BUILD_SHA || "development",
  chatCount,
  cpuRate,
  runs,
  offRuns: results.off,
  onRuns: results.on,
  offP75,
  onP75,
  regressionPercent,
  offStartupDuration,
  onStartupDuration,
  startupRegressionPercent,
  offLongTaskTime,
  onLongTaskTime,
  onFlushRoundTripDuration,
  telemetryFlushSucceeded,
  passesP75Budget: regressionPercent <= 3,
  passesStartupBudget: startupRegressionPercent <= 3,
  passesLongTaskBudget: !createsLongTasks,
};
const summaryDirectory = path.join(
  workspace,
  ".performance-artifacts",
  "metrics",
  `telemetry-overhead-chats-${chatCount}-cpu-${cpuRate}`,
);
mkdirSync(summaryDirectory, { recursive: true });
writeFileSync(
  path.join(summaryDirectory, "summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

if (
  !summary.passesP75Budget ||
  !summary.passesStartupBudget ||
  !summary.passesLongTaskBudget ||
  !summary.telemetryFlushSucceeded
) process.exitCode = 1;
