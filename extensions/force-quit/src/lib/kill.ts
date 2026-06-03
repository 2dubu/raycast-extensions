import { Alert, confirmAlert, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function killByPid(pid: number, name: string): Promise<boolean> {
  const confirmed = await confirmAlert({
    title: `Force quit ${name}?`,
    message: "This will immediately terminate the process.",
    primaryAction: { title: "Force Quit", style: Alert.ActionStyle.Destructive },
  });

  if (!confirmed) return false;

  try {
    process.kill(pid, "SIGKILL");
    await showHUD(`✓ ${name} force quit`);
    return true;
  } catch (error) {
    // Processes owned by root or another user reject an unprivileged SIGKILL with EPERM.
    // Offer an authenticated retry that surfaces the native admin prompt.
    if ((error as NodeJS.ErrnoException).code === "EPERM") {
      return killWithPrivileges(pid, name);
    }
    await showHUD(`✗ Failed to quit ${name}`);
    return false;
  }
}

async function killWithPrivileges(pid: number, name: string): Promise<boolean> {
  const escalate = await confirmAlert({
    title: `${name} requires administrator privileges`,
    message: "This process is owned by the system. Force quit as administrator?",
    primaryAction: { title: "Force Quit as Admin", style: Alert.ActionStyle.Destructive },
  });

  if (!escalate) return false;

  try {
    await execFileAsync("/usr/bin/osascript", [
      "-e",
      `do shell script "/bin/kill -9 ${pid}" with administrator privileges`,
    ]);
    await showHUD(`✓ ${name} force quit`);
    return true;
  } catch {
    // Covers both a cancelled auth prompt and a failed kill.
    await showHUD(`✗ Failed to quit ${name}`);
    return false;
  }
}
