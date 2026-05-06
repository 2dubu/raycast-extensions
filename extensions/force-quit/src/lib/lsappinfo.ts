import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type LsAppEntry = {
  name: string;
  pid: number;
  bundlePath: string;
  type: string;
};

export async function getLsAppEntries(): Promise<LsAppEntry[]> {
  const { stdout } = await execFileAsync("/usr/bin/lsappinfo", ["list"], {
    maxBuffer: 5 * 1024 * 1024,
  });
  const entries: LsAppEntry[] = [];
  // Each entry begins with " N) " at the start of a line.
  for (const entry of stdout.split(/\n(?=\s*\d+\)\s)/)) {
    const nameMatch = entry.match(/^\s*\d+\)\s+"([^"]+)"/);
    if (!nameMatch) continue;
    const pidMatch = entry.match(/pid\s*=\s*(\d+)/);
    if (!pidMatch) continue;
    const pid = Number.parseInt(pidMatch[1], 10);
    if (!Number.isFinite(pid)) continue;
    const typeMatch = entry.match(/type="([^"]+)"/);
    const bundleMatch = entry.match(/bundle path="([^"]+)"/);
    entries.push({
      name: nameMatch[1],
      pid,
      bundlePath: bundleMatch ? bundleMatch[1] : "",
      type: typeMatch ? typeMatch[1] : "",
    });
  }
  return entries;
}
