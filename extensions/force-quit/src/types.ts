export type SortKey = "memory" | "cpu";

export type RunningApp = {
  name: string;
  pid: number;
  bundlePath: string;
  memoryMB: number;
  cpuPercent: number;
};

export type RunningProcess = {
  name: string;
  pid: number;
  memoryMB: number;
  cpuPercent: number;
  bundlePath?: string;
};
