import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchAllProcesses } from "./lib/processes";
import { killByPid } from "./lib/kill";
import { formatMemoryMB } from "./lib/format";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(fetchAllProcesses, [], { initialData: [] });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search processes...">
      <List.EmptyView title="No processes found" />
      {data.map((proc) => (
        <List.Item
          key={proc.pid}
          icon={proc.bundlePath ? { fileIcon: proc.bundlePath } : Icon.Terminal}
          title={proc.name}
          accessories={[{ tag: formatMemoryMB(proc.memoryMB) }]}
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
