# Force Quit Raycast Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Raycast extension named "Force Quit" with two commands (apps + processes) that mirror macOS' ⌥⌘⎋ behavior, and prepare it for submission to the Raycast Store under the `2dubu` GitHub account.

**Architecture:** Two `view`-mode commands backed by pure-data lib modules. Apps are queried via AppleScript (`System Events`); processes are queried via `ps`. Memory (RSS) is fetched in a single batched `ps` call. Selecting an item shows a confirm dialog; on confirm, the item is killed via `process.kill(pid, "SIGKILL")` and the result is announced through a Raycast HUD.

**Tech Stack:** TypeScript (strict), `@raycast/api`, `@raycast/utils` (`useCachedPromise`), Node `child_process`, AppleScript via `osascript`, `ps`. No native binaries, no extra runtime deps.

---

## Pre-flight Notes

- **Working directory:** `/Users/owen.lee/workspace/personal/raycast-extension/` (already a git repo, currently contains only `docs/`).
- **Per-step commit identity:** This path is under `~/workspace/personal/`, which the user's `~/.gitconfig` maps via `includeIf` to `~/.gitconfig-personal` (`2dubu <lgw101142@gmail.com>`). Just run `git commit` — do NOT pass `-c user.email=...` or `-c user.name=...`.
- **Commit trailer rule:** Never add `Co-Authored-By: Claude` or any Claude attribution to commits. (This is a permanent user preference.)
- **No automated tests** (per spec §8.1). Each task ends with a *manual verification* step against `npm run dev` (Raycast hot-reloads on save), plus a commit.
- **macOS only.** Do not propose Linux/Windows fallbacks.
- **Raycast `npm run dev`:** When dev mode is running, the extension appears in the local Raycast app under the same display name. Use Raycast (`⌘ Space`) → type "Force Quit" to launch.
- **PID format:** PIDs are integers throughout. Memory is stored as `number` in **MB** (rounded), with `formatMemoryMB` adding the unit and thousands separators only at render time.

---

## File Structure

```
raycast-extension/
├── docs/                                # already exists (specs/plans)
├── package.json                         # Task 1 — Raycast manifest + deps
├── tsconfig.json                        # Task 1
├── .eslintrc.json                       # Task 1
├── .gitignore                           # Task 1
├── .prettierrc                          # Task 1
├── assets/
│   └── extension-icon.png               # Task 9 — placeholder, user can replace
├── metadata/                            # Task 9 — populated by user (5 PNGs)
├── README.md                            # Task 9
├── CHANGELOG.md                         # Task 9
└── src/
    ├── types.ts                         # Task 2 — shared types
    ├── lib/
    │   ├── format.ts                    # Task 3 — formatMemoryMB
    │   ├── apps.ts                      # Task 4 — fetchRunningApps
    │   ├── processes.ts                 # Task 5 — fetchAllProcesses
    │   └── kill.ts                      # Task 6 — killByPid (UI side-effects)
    ├── index.tsx                        # Task 7 — Force Quit Application
    └── process.tsx                      # Task 8 — Force Quit Process
```

**Module boundaries (recap from spec §6.2):**

- `lib/apps.ts`, `lib/processes.ts`, `lib/format.ts`: pure modules. **No imports from `@raycast/api` or `react`.**
- `lib/kill.ts`: side-effect module. Uses `@raycast/api` (`Alert`, `showHUD`).
- `index.tsx`, `process.tsx`: thin UI. No business logic.

---

## Task 1: Scaffold Raycast extension package

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.eslintrc.json`
- Create: `.gitignore`
- Create: `.prettierrc`
- Create (empty dirs): `src/`, `src/lib/`, `assets/`, `metadata/`

- [ ] **Step 1: Create `package.json`**

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "force-quit",
  "title": "Force Quit",
  "description": "Force quit running applications and processes from Raycast",
  "icon": "extension-icon.png",
  "author": "2dubu",
  "categories": ["System", "Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "index",
      "title": "Force Quit",
      "subtitle": "Quit running applications",
      "description": "List running applications and force quit the selected one",
      "mode": "view"
    },
    {
      "name": "process",
      "title": "Force Quit Process",
      "subtitle": "Quit any running process",
      "description": "List all running processes and force quit the selected one",
      "mode": "view"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.85.0",
    "@raycast/utils": "^1.18.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.11",
    "@types/node": "20.8.10",
    "@types/react": "18.3.3",
    "eslint": "^8.57.0",
    "prettier": "^3.3.3",
    "typescript": "^5.4.5"
  },
  "scripts": {
    "build": "ray build",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint",
    "publish": "npx @raycast/api@latest publish"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "include": ["src/**/*"],
  "compilerOptions": {
    "lib": ["ES2023"],
    "module": "commonjs",
    "target": "ES2022",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 3: Create `.eslintrc.json`**

```json
{
  "root": true,
  "extends": ["@raycast"]
}
```

- [ ] **Step 4: Create `.prettierrc`**

```json
{
  "printWidth": 120,
  "singleQuote": false,
  "trailingComma": "all"
}
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
.DS_Store
*.log
dist/
.raycast/
```

- [ ] **Step 6: Create empty source/asset directories**

Run:
```bash
mkdir -p src/lib assets metadata
```

- [ ] **Step 7: Install dependencies**

Run:
```bash
npm install
```

Expected: dependencies install without error. `node_modules/` created. `package-lock.json` created.

- [ ] **Step 8: Manual verification — sanity build**

Run:
```bash
npx ray build 2>&1 || true
```

Expected: build will likely complain about missing `assets/extension-icon.png` and missing `src/index.tsx` / `src/process.tsx`. **That's OK** — we just want to confirm the toolchain is wired up. If `ray` is not found, run `npm install` again.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json .eslintrc.json .prettierrc .gitignore
git commit -m "Scaffold Raycast extension package"
```

---

## Task 2: Define shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write `src/types.ts`**

```ts
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
};
```

- [ ] **Step 2: Manual verification — type check**

Run:
```bash
npx tsc --noEmit
```

Expected: exits 0 with no output (file is valid TypeScript).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "Add shared types for running apps and processes"
```

---

## Task 3: Memory formatting utility

**Files:**
- Create: `src/lib/format.ts`

- [ ] **Step 1: Write `src/lib/format.ts`**

```ts
export function kbToMB(rssKB: number): number {
  return Math.round(rssKB / 1024);
}

export function formatMemoryMB(memoryMB: number): string {
  return `${memoryMB.toLocaleString("en-US")} MB`;
}
```

Why two functions: `kbToMB` runs at fetch time (so the rest of the app deals with `number`), `formatMemoryMB` runs at render time (so accessibility/copy logic can work with the number).

- [ ] **Step 2: Manual verification — quick REPL check**

Run:
```bash
node -e "
const { kbToMB, formatMemoryMB } = require('./src/lib/format.ts');
console.log(kbToMB(1048576));
console.log(formatMemoryMB(1243));
"
```

If `.ts` direct require fails (it likely will under plain node), instead run:
```bash
npx tsc --noEmit src/lib/format.ts
```

Expected: type check passes silently.

- [ ] **Step 3: Commit**

```bash
git add src/lib/format.ts
git commit -m "Add memory formatting utilities"
```

---

## Task 4: `fetchRunningApps` (AppleScript + batched ps)

**Files:**
- Create: `src/lib/apps.ts`

- [ ] **Step 1: Write `src/lib/apps.ts`**

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { kbToMB } from "./format";
import type { RunningApp } from "../types";

const execFileAsync = promisify(execFile);

const APPLESCRIPT = `
tell application "System Events"
  set output to ""
  repeat with p in (every application process whose background only is false)
    try
      set output to output & (name of p) & "|" & (unix id of p) & "|" & (POSIX path of (file of p)) & linefeed
    end try
  end repeat
  return output
end tell
`;

type RawApp = { name: string; pid: number; bundlePath: string };

async function listGuiApps(): Promise<RawApp[]> {
  const { stdout } = await execFileAsync("osascript", ["-e", APPLESCRIPT], { maxBuffer: 1024 * 1024 });
  const apps: RawApp[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("|");
    if (parts.length < 3) continue;
    const [name, pidStr, bundlePath] = parts;
    const pid = Number.parseInt(pidStr, 10);
    if (!Number.isFinite(pid)) continue;
    apps.push({ name, pid, bundlePath });
  }
  return apps;
}

async function batchMemoryByPid(pids: number[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (pids.length === 0) return result;
  const { stdout } = await execFileAsync("ps", ["-o", "pid=,rss=", "-p", pids.join(",")], {
    maxBuffer: 1024 * 1024,
  });
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [pidStr, rssStr] = trimmed.split(/\s+/);
    const pid = Number.parseInt(pidStr, 10);
    const rssKB = Number.parseInt(rssStr, 10);
    if (!Number.isFinite(pid) || !Number.isFinite(rssKB)) continue;
    result.set(pid, kbToMB(rssKB));
  }
  return result;
}

export async function fetchRunningApps(): Promise<RunningApp[]> {
  const raw = await listGuiApps();
  const memory = await batchMemoryByPid(raw.map((a) => a.pid));
  return raw
    .map((a) => ({ ...a, memoryMB: memory.get(a.pid) ?? 0 }))
    .sort((a, b) => b.memoryMB - a.memoryMB);
}
```

Notes:
- `try`/`end try` inside the AppleScript repeat skips processes whose `file` is unset (rare edge case).
- `maxBuffer: 1MB` is safe for 100s of apps.
- If `bundlePath` is empty, the UI will fall back to a generic icon — handled in Task 7.

- [ ] **Step 2: Manual verification — type check**

Run:
```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Manual verification — runtime smoke**

Run:
```bash
node --input-type=module -e "
import('tsx/esm').catch(() => {});
"
```

Skip the runtime smoke in node and instead verify via the integrated UI in Task 7. (The function is not called until the command UI is wired up.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/apps.ts
git commit -m "Add fetchRunningApps: AppleScript + batched ps for GUI apps"
```

---

## Task 5: `fetchAllProcesses` (single ps call)

**Files:**
- Create: `src/lib/processes.ts`

- [ ] **Step 1: Write `src/lib/processes.ts`**

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { kbToMB } from "./format";
import type { RunningProcess } from "../types";

const execFileAsync = promisify(execFile);

export async function fetchAllProcesses(): Promise<RunningProcess[]> {
  const { stdout } = await execFileAsync("ps", ["-axo", "pid=,rss=,comm="], {
    maxBuffer: 5 * 1024 * 1024,
  });
  const processes: RunningProcess[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    // Split into at most 3 tokens: pid, rss, comm-with-spaces
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
    if (!match) continue;
    const pid = Number.parseInt(match[1], 10);
    const rssKB = Number.parseInt(match[2], 10);
    const name = match[3].trim();
    if (!Number.isFinite(pid) || !Number.isFinite(rssKB) || rssKB <= 0 || !name) continue;
    processes.push({ pid, name, memoryMB: kbToMB(rssKB) });
  }
  return processes.sort((a, b) => b.memoryMB - a.memoryMB);
}
```

Notes:
- `comm` may contain spaces (e.g., `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`). The regex captures the rest of the line as a single token.
- `rssKB <= 0` filters out kernel threads / zombie processes per spec §4.2.
- 5MB buffer covers very large process lists comfortably.

- [ ] **Step 2: Manual verification — type check**

Run:
```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/processes.ts
git commit -m "Add fetchAllProcesses: ps-based all-processes listing"
```

---

## Task 6: `killByPid` — confirm + SIGKILL + HUD

**Files:**
- Create: `src/lib/kill.ts`

- [ ] **Step 1: Write `src/lib/kill.ts`**

```ts
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
```

Notes:
- Returns `true` only on actual SIGKILL success — UI uses this to decide whether to revalidate.
- `process.kill` throws `EPERM` (no permission, e.g., root processes) and `ESRCH` (no such process). Both surface as the same `✗` HUD per spec §5.1.
- No special-casing of Finder/SystemUIServer — explicitly out of scope (spec §2).

- [ ] **Step 2: Manual verification — type check**

Run:
```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/kill.ts
git commit -m "Add killByPid: confirm dialog, SIGKILL, HUD feedback"
```

---

## Task 7: `Force Quit Application` command UI

**Files:**
- Create: `src/index.tsx`

- [ ] **Step 1: Write `src/index.tsx`**

```tsx
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
```

Notes:
- `useCachedPromise([])` — empty deps array, function fires once on mount.
- `initialData: []` — so `data` is never `undefined`; simplifies the `.map` call.
- `Icon.AppWindow` fallback only used if AppleScript returns an empty `bundlePath` (rare).
- `Icon.XMarkCircle` for the destructive action.

- [ ] **Step 2: Manual verification — start dev mode**

Run:
```bash
npm run dev
```

Then in the Raycast app: `⌘ Space` → type "Force Quit" → press Enter to launch the command.

Expected:
- List populates with running apps within ~500ms.
- Each row shows native app icon, name, memory in MB (descending).
- Pressing Enter on an app opens a confirm dialog with the destructive style "Force Quit" button.
- Cancelling does nothing.
- Confirming kills the app, shows `✓ <name> force quit` HUD, list refreshes (the killed app disappears).
- `⌘R` triggers a refresh.
- `⌘.` copies `<name> (PID <pid>)` to clipboard (verify by pasting somewhere).

Stop dev mode (`Ctrl+C`) once verified.

- [ ] **Step 3: Commit**

```bash
git add src/index.tsx
git commit -m "Add Force Quit Application command UI"
```

---

## Task 8: `Force Quit Process` command UI

**Files:**
- Create: `src/process.tsx`

- [ ] **Step 1: Write `src/process.tsx`**

```tsx
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
          icon={Icon.Terminal}
          title={proc.name}
          subtitle={`PID ${proc.pid}`}
          accessories={[{ text: formatMemoryMB(proc.memoryMB) }]}
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
```

Notes:
- Always `Icon.Terminal` per the spec revision (no GUI matching upgrade).
- Same kill/refresh/copy actions as the Application command.

- [ ] **Step 2: Manual verification**

Run:
```bash
npm run dev
```

In Raycast: type "Force Quit Process" → Enter.

Expected:
- List populates with all processes (more entries than the Application command — daemons, helpers, etc.).
- Sorted by memory desc.
- All rows show terminal icon.
- Subtitle displays `PID 1234` style.
- Try killing a low-stakes process (e.g., a `cat` or `node` process you started yourself). Confirm dialog → SIGKILL → HUD.
- Try killing `launchd` (PID 1) — should show `✗ Failed to quit launchd` (EPERM).

Stop dev mode (`Ctrl+C`).

- [ ] **Step 3: Commit**

```bash
git add src/process.tsx
git commit -m "Add Force Quit Process command UI"
```

---

## Task 9: README, CHANGELOG, icon placeholder

**Files:**
- Create: `README.md`
- Create: `CHANGELOG.md`
- Create: `assets/extension-icon.png` (placeholder, to be replaced by user)

- [ ] **Step 1: Write `README.md`**

```markdown
# Force Quit

Force quit running applications and processes from Raycast — like macOS' ⌥⌘⎋, but without leaving your keyboard.

## Commands

### Force Quit
List running applications sorted by memory usage. Select an app and press Enter to force quit it after a confirmation prompt.

### Force Quit Process
Same flow, but lists *every* process on the system (background daemons included). Useful when an app is unresponsive but doesn't appear in the standard list.

## Behavior

- Selecting an item shows a confirm dialog. Confirming sends `SIGKILL` immediately — equivalent to macOS' built-in Force Quit.
- A HUD message confirms success or failure.
- `⌘R` refreshes the list manually. The list does not auto-poll.

## Permissions

Force Quit uses Raycast's existing automation permission to query running applications via AppleScript. No additional setup is required.
```

- [ ] **Step 2: Write `CHANGELOG.md`**

```markdown
# Force Quit Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Force Quit: list and immediately quit running applications.
- Force Quit Process: list and immediately quit any running process.
```

The literal `{PR_MERGE_DATE}` is a Raycast Store convention — the Store replaces it with the merge date on publish.

- [ ] **Step 3: Add a placeholder extension icon**

Run:
```bash
# Create a 1024x1024 transparent PNG placeholder so `ray build` doesn't fail.
# The user is expected to replace this with the real icon before publish.
sips -s format png --resampleHeightWidth 1024 1024 \
  /System/Library/PrivateFrameworks/LoginUIKit.framework/Versions/A/Resources/UserUnknown.tiff \
  --out assets/extension-icon.png 2>/dev/null || \
  /usr/bin/python3 -c "
from struct import pack
import zlib
def png(w, h):
  sig = b'\\x89PNG\\r\\n\\x1a\\n'
  ihdr = pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
  ihdr_chunk = b'IHDR' + ihdr
  ihdr_full = pack('>I', len(ihdr)) + ihdr_chunk + pack('>I', zlib.crc32(ihdr_chunk) & 0xffffffff)
  raw = b''.join(b'\\x00' + b'\\x00\\x00\\x00\\x00' * w for _ in range(h))
  data = zlib.compress(raw)
  idat_chunk = b'IDAT' + data
  idat = pack('>I', len(data)) + idat_chunk + pack('>I', zlib.crc32(idat_chunk) & 0xffffffff)
  iend_chunk = b'IEND'
  iend = pack('>I', 0) + iend_chunk + pack('>I', zlib.crc32(iend_chunk) & 0xffffffff)
  return sig + ihdr_full + idat + iend
open('assets/extension-icon.png', 'wb').write(png(1024, 1024))
"
```

Expected: `assets/extension-icon.png` exists, ~few KB, 1024×1024. Verify:
```bash
file assets/extension-icon.png
```

This is a placeholder. The user must replace it with a real icon before submission.

- [ ] **Step 4: Manual verification — build**

Run:
```bash
npm run build
```

Expected: build completes without errors. Output is in `.raycast/` (gitignored).

- [ ] **Step 5: Manual verification — lint**

Run:
```bash
npm run lint
```

Expected: zero errors. If there are warnings, fix them inline (likely formatting). Re-run until clean.

- [ ] **Step 6: Commit**

```bash
git add README.md CHANGELOG.md assets/extension-icon.png
git commit -m "Add README, CHANGELOG, and placeholder icon"
```

---

## Task 10: Submission preparation

**Files:**
- Modify (placeholder replace): `assets/extension-icon.png`
- Create (user-provided): `metadata/force-quit-1.png` … `metadata/force-quit-5.png`

- [ ] **Step 1: Replace placeholder icon (user action)**

Ask the user to drop their final 1024×1024 PNG icon at `assets/extension-icon.png`. Verify dimensions:

```bash
sips -g pixelWidth -g pixelHeight assets/extension-icon.png
```

Expected: `pixelWidth: 1024`, `pixelHeight: 1024`.

- [ ] **Step 2: Add 5 store screenshots (user action)**

Ask the user to capture 5 screenshots (2000×1250 PNG) using Raycast's built-in screenshot capture (Window menu → Capture Window for Store), and place them at `metadata/force-quit-1.png` … `metadata/force-quit-5.png`.

Verify:
```bash
ls metadata/
sips -g pixelWidth -g pixelHeight metadata/force-quit-1.png
```

Expected: 5 files, each 2000×1250.

- [ ] **Step 3: Final lint + build sanity**

Run:
```bash
npm run lint && npm run build
```

Expected: zero errors on both.

- [ ] **Step 4: Commit assets**

```bash
git add assets/extension-icon.png metadata/
git commit -m "Add final icon and store screenshots"
```

- [ ] **Step 5: Verify GitHub auth (manual)**

Tell the user to ensure they're authenticated as `2dubu` on GitHub:

```bash
gh auth status
```

Expected: shows `2dubu` (or matching email `lgw101142@gmail.com`).

If not authenticated as 2dubu:
```bash
gh auth login
```
Pick the appropriate account.

- [ ] **Step 6: Submit to Raycast Store**

Run:
```bash
npm run publish
```

This will:
1. Fork `raycast/extensions` to `2dubu/extensions` (if not already forked).
2. Create a branch, copy the extension files into `extensions/force-quit/`.
3. Commit with message `Add force-quit extension` (Raycast standard format).
4. Push and open a PR to `raycast/extensions`.

After the script completes, it prints the PR URL. Open it and verify:
- PR title: `Add force-quit extension`
- The PR diff contains only `extensions/force-quit/**`.
- All commits are authored by `2dubu <lgw101142@gmail.com>`.
- No `Co-Authored-By: Claude` lines anywhere.

- [ ] **Step 7: Final commit (local repo)**

If `npm run publish` produced any local changes (e.g., a build artifact reference), commit them:

```bash
git status
# If clean: skip. Otherwise:
git add -A && git commit -m "Sync after Store submission"
```

- [ ] **Step 8: Done**

Wait for Raycast's review on the PR. Address feedback by pushing additional commits to the same PR branch.

---

## Self-Review

(Performed inline by the plan author after writing.)

**Spec coverage check:**
- §3 metadata → Task 1 (`package.json`)
- §4.1 Force Quit Application → Tasks 2, 3, 4, 6, 7
- §4.2 Force Quit Process → Tasks 2, 3, 5, 6, 8
- §5.1 actions (kill / refresh / copy) → Tasks 6, 7, 8
- §5.2 empty state → Tasks 7, 8
- §6 architecture / file structure → File Structure section + all tasks
- §7.1 AppleScript → Task 4
- §7.2 batched ps → Task 4
- §7.3 SIGKILL → Task 6
- §7.4 cache key → handled implicitly by Raycast `useCachedPromise` per-command
- §8.2 manual verification → Tasks 7, 8 (`npm run dev` smoke), Task 9 (lint/build)
- §9 submission → Task 10

**Placeholder scan:** No "TBD", "TODO", "implement later", "similar to", or unspecified handlers. The icon is explicitly a *placeholder* with a step requiring user replacement before submission.

**Type consistency:** `RunningApp` and `RunningProcess` defined in Task 2 are the only types referenced in later tasks. `formatMemoryMB`, `kbToMB`, `fetchRunningApps`, `fetchAllProcesses`, `killByPid` names are all consistent across their definition and call sites.

**Open issue (intentional, not a defect):** The placeholder icon generated in Task 9 is a transparent 1024×1024 PNG. The Raycast Store will reject this for visual review, so Task 10 explicitly requires the user to replace it. Documented up front.
