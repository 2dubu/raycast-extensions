import type { SortKey } from "../types";

type Sortable = { memoryMB: number; cpuPercent: number };

export function compareBySortKey<T extends Sortable>(sortKey: SortKey): (a: T, b: T) => number {
  return (a, b) => (sortKey === "cpu" ? b.cpuPercent - a.cpuPercent : b.memoryMB - a.memoryMB);
}
