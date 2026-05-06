import { Alert, confirmAlert, showHUD } from "@raycast/api";

export async function killByPid(pid: number, name: string): Promise<boolean> {
  const confirmed = await confirmAlert({
    title: `Force quit ${name}?`,
    message: "This will immediately terminate the application.",
    primaryAction: { title: "Force Quit", style: Alert.ActionStyle.Destructive },
  });

  if (!confirmed) return false;

  try {
    process.kill(pid, "SIGKILL");
    await showHUD(`✓ ${name} force quit`);
    return true;
  } catch {
    await showHUD(`✗ Failed to quit ${name}`);
    return false;
  }
}
