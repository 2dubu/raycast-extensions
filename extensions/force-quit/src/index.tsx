import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchRunningApps } from "./lib/apps";
import { killByPid } from "./lib/kill";
import { formatMemoryMB } from "./lib/format";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(fetchRunningApps, [], { initialData: [] });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search applications...">
      <List.EmptyView title="No applications running" />
      {data.map((app) => (
        <List.Item
          key={app.pid}
          icon={app.bundlePath ? { fileIcon: app.bundlePath } : Icon.AppWindow}
          title={app.name}
          accessories={[{ text: formatMemoryMB(app.memoryMB) }]}
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
