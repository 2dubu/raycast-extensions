import { getPreferenceValues } from "@raycast/api";
import { useEffect } from "react";

// Polls the list on an interval set by the `refreshInterval` preference (ms).
// 0 or an unparseable value disables polling; anything below 1000ms is clamped up.
export function useAutoRefresh(revalidate: () => void): void {
  useEffect(() => {
    const { refreshInterval } = getPreferenceValues<{ refreshInterval?: string }>();
    const ms = Number.parseInt(refreshInterval ?? "", 10);
    if (!Number.isFinite(ms) || ms <= 0) return;

    const id = setInterval(revalidate, Math.max(ms, 1000));
    return () => clearInterval(id);
  }, [revalidate]);
}
