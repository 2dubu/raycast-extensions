export function kbToMB(rssKB: number): number {
  return Math.round(rssKB / 1024);
}

export function formatMemoryMB(memoryMB: number): string {
  return `${memoryMB.toLocaleString()} MB`;
}

export function formatCpu(cpuPercent: number): string {
  return `${cpuPercent.toFixed(1)}%`;
}
