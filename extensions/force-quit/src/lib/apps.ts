import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { kbToMB } from "./format";
import { getLsAppEntries } from "./lsappinfo";
import type { RunningApp } from "../types";

const execFileAsync = promisify(execFile);

async function batchMemoryByPid(pids: number[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (pids.length === 0) return result;
  const { stdout } = await execFileAsync("/bin/ps", ["-o", "pid=,rss=", "-p", pids.join(",")], {
    maxBuffer: 1024 * 1024,
  });
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [pidStr, rssStr] = trimmed.split(/\s+/);
    const pid = Number.parseInt(pidStr, 10);
    const rssKB = Number.parseInt(rssStr, 10);
    if (!Number.isFinite(pid) || !Number.isFinite(rssKB)) continue;
    result.set(pid, kbToMB(rssKB));
  }
  return result;
}

export async function fetchRunningApps(): Promise<RunningApp[]> {
  const entries = await getLsAppEntries();
  // Replicate macOS' Force Quit window: only foreground apps (visible in Dock / Cmd+Tab).
  const foreground = entries.filter((e) => e.type === "Foreground");
  const memory = await batchMemoryByPid(foreground.map((e) => e.pid));
  return foreground
    .map(({ name, pid, bundlePath }) => ({ name, pid, bundlePath, memoryMB: memory.get(pid) ?? 0 }))
    .sort((a, b) => b.memoryMB - a.memoryMB);
}
