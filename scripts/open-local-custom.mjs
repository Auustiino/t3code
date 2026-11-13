import * as NodeChildProcess from "node:child_process";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import * as NodeUtil from "node:util";

const { values } = NodeUtil.parseArgs({ options: { "print-url": { type: "boolean" } } });
const execFile = NodeUtil.promisify(NodeChildProcess.execFile);
const root = NodeURL.fileURLToPath(new URL("../", import.meta.url));
const origin = "http://localhost:5733";
const health = await fetch(`${origin}/api/auth/session`, { signal: AbortSignal.timeout(5_000) });
if (!health.ok) throw new Error(`T3 Code Custom is unavailable (HTTP ${health.status}).`);

const { stdout } = await execFile(
  process.execPath,
  [
    NodePath.join(root, "apps/server/src/bin.ts"),
    "auth",
    "pairing",
    "create",
    "--base-dir",
    NodePath.join(root, ".t3"),
    "--base-url",
    origin,
    "--ttl",
    "5m",
    "--label",
    "T3 Code Custom launcher",
    "--json",
  ],
  { cwd: root, timeout: 15_000 },
);
const { pairUrl } = JSON.parse(stdout);
if (typeof pairUrl !== "string" || new URL(pairUrl).origin !== origin) {
  throw new Error("T3 Code Custom did not return a local pairing link.");
}
if (values["print-url"]) console.log(pairUrl);
else await execFile("/usr/bin/open", [pairUrl]);
