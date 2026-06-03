import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { kbToMB } from "./format";
import { getLsAppEntries } from "./lsappinfo";
import type { RunningApp } from "../types";

const execFileAsync = promisify(execFile);

type Stats = { memoryMB: number; cpuPercent: number };

async function batchStatsByPid(pids: number[]): Promise<Map<number, Stats>> {
  const result = new Map<number, Stats>();
  if (pids.length === 0) return result;
  const { stdout } = await execFileAsync("/bin/ps", ["-o", "pid=,rss=,%cpu=", "-p", pids.join(",")], {
    maxBuffer: 1024 * 1024,
  });
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [pidStr, rssStr, cpuStr] = trimmed.split(/\s+/);
    const pid = Number.parseInt(pidStr, 10);
    const rssKB = Number.parseInt(rssStr, 10);
    const cpu = Number.parseFloat(cpuStr);
    if (!Number.isFinite(pid) || !Number.isFinite(rssKB)) continue;
    result.set(pid, { memoryMB: kbToMB(rssKB), cpuPercent: Number.isFinite(cpu) ? cpu : 0 });
  }
  return result;
}

export async function fetchRunningApps(): Promise<RunningApp[]> {
  const entries = await getLsAppEntries();
  // Replicate macOS' Force Quit window: only foreground apps (visible in Dock / Cmd+Tab).
  const foreground = entries.filter((e) => e.type === "Foreground");
  const stats = await batchStatsByPid(foreground.map((e) => e.pid));
  return foreground.map(({ name, pid, bundlePath }) => {
    const s = stats.get(pid);
    return { name, pid, bundlePath, memoryMB: s?.memoryMB ?? 0, cpuPercent: s?.cpuPercent ?? 0 };
  });
}
