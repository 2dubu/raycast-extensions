import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { kbToMB } from "./format";
import { getLsAppEntries } from "./lsappinfo";
import type { RunningProcess } from "../types";

const execFileAsync = promisify(execFile);

type RawProcess = { pid: number; name: string; memoryMB: number; cpuPercent: number };

async function listProcesses(): Promise<RawProcess[]> {
  const { stdout } = await execFileAsync("/bin/ps", ["-axo", "pid=,rss=,%cpu=,comm="], {
    maxBuffer: 5 * 1024 * 1024,
  });
  const processes: RawProcess[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    // Split into at most 4 tokens: pid, rss, %cpu, comm-with-spaces
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+(.*)$/);
    if (!match) continue;
    const pid = Number.parseInt(match[1], 10);
    const rssKB = Number.parseInt(match[2], 10);
    const cpu = Number.parseFloat(match[3]);
    // macOS `comm` is the full executable path; show just the basename as the title.
    const comm = match[4].trim();
    const name = comm.split("/").pop() || comm;
    if (!Number.isFinite(pid) || !Number.isFinite(rssKB) || rssKB <= 0 || !name) continue;
    processes.push({ pid, name, memoryMB: kbToMB(rssKB), cpuPercent: Number.isFinite(cpu) ? cpu : 0 });
  }
  return processes;
}

async function getBundlePathByPid(): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const entries = await getLsAppEntries();
  for (const entry of entries) {
    if (entry.bundlePath.endsWith(".app")) {
      result.set(entry.pid, entry.bundlePath);
    }
  }
  return result;
}

export async function fetchAllProcesses(): Promise<RunningProcess[]> {
  const [rawProcesses, bundlePaths] = await Promise.all([listProcesses(), getBundlePathByPid()]);
  return rawProcesses.map((p) => {
    const bundlePath = bundlePaths.get(p.pid);
    return bundlePath ? { ...p, bundlePath } : p;
  });
}
