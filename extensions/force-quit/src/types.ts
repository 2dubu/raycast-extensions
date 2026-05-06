export type RunningApp = {
  name: string;
  pid: number;
  bundlePath: string;
  memoryMB: number;
};

export type RunningProcess = {
  name: string;
  pid: number;
  memoryMB: number;
  bundlePath?: string;
};
