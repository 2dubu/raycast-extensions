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

Force Quit only reads the public macOS process list (`lsappinfo`, `ps`) — no Automation permission, Accessibility permission, or full‑disk access is required.
