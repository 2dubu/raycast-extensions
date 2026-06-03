import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { fetchAllProcesses } from "./lib/processes";
import { killByPid } from "./lib/kill";
import { formatCpu, formatMemoryMB } from "./lib/format";
import { compareBySortKey } from "./lib/sort";
import { useAutoRefresh } from "./lib/useAutoRefresh";
import type { SortKey } from "./types";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(fetchAllProcesses, [], { initialData: [] });
  const [sortKey, setSortKey] = useState<SortKey>("memory");
  useAutoRefresh(revalidate);

  const sorted = useMemo(() => [...data].sort(compareBySortKey(sortKey)), [data, sortKey]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search processes..."
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" value={sortKey} onChange={(value) => setSortKey(value as SortKey)}>
          <List.Dropdown.Item title="Memory" value="memory" />
          <List.Dropdown.Item title="CPU" value="cpu" />
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No processes found" />
      {sorted.map((proc) => (
        <List.Item
          key={proc.pid}
          icon={proc.bundlePath ? { fileIcon: proc.bundlePath } : Icon.Terminal}
          title={proc.name}
          accessories={[
            {
              icon: { source: Icon.Gauge, tintColor: Color.PrimaryText },
              text: formatCpu(proc.cpuPercent),
              tooltip: "CPU",
            },
            {
              icon: { source: Icon.MemoryChip, tintColor: Color.PrimaryText },
              text: formatMemoryMB(proc.memoryMB),
              tooltip: "Memory",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Force Quit"
                icon={Icon.XMarkCircle}
                onAction={async () => {
                  const ok = await killByPid(proc.pid, proc.name);
                  if (ok) revalidate();
                }}
              />
              <Action
                title="Refresh List"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
              <Action.CopyToClipboard
                title="Copy Process Info"
                content={`${proc.name} (PID ${proc.pid})`}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
