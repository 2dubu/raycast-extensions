import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { fetchRunningApps } from "./lib/apps";
import { killByPid } from "./lib/kill";
import { formatCpu, formatMemoryMB } from "./lib/format";
import { compareBySortKey } from "./lib/sort";
import type { SortKey } from "./types";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(fetchRunningApps, [], { initialData: [] });
  const [sortKey, setSortKey] = useState<SortKey>("memory");

  const sorted = useMemo(() => [...data].sort(compareBySortKey(sortKey)), [data, sortKey]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search applications..."
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" value={sortKey} onChange={(value) => setSortKey(value as SortKey)}>
          <List.Dropdown.Item title="Memory" value="memory" />
          <List.Dropdown.Item title="CPU" value="cpu" />
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No applications running" />
      {sorted.map((app) => (
        <List.Item
          key={app.pid}
          icon={app.bundlePath ? { fileIcon: app.bundlePath } : Icon.AppWindow}
          title={app.name}
          accessories={[
            { text: formatCpu(app.cpuPercent), tooltip: "CPU" },
            { text: formatMemoryMB(app.memoryMB), tooltip: "Memory" },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Force Quit"
                icon={Icon.XMarkCircle}
                onAction={async () => {
                  const ok = await killByPid(app.pid, app.name);
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
                content={`${app.name} (PID ${app.pid})`}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
