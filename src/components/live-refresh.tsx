"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Polls a durable event cursor and re-renders the page's server components
 * when it changes. This works when requests land on different serverless
 * instances, while keeping the pages themselves as server components.
 */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let cursor: string | null | undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (document.visibilityState === "visible") {
        try {
          const response = await fetch("/api/events", { cache: "no-store" });
          if (response.ok) {
            const latest = (await response.json()) as { id: string } | null;
            const nextCursor = latest?.id ?? null;
            if (cursor !== undefined && nextCursor !== cursor) router.refresh();
            cursor = nextCursor;
          }
        } catch {
          // A later poll will recover from a transient network failure.
        }
      }
      if (!stopped) timer = setTimeout(poll, 2_000);
    };

    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [router]);

  return null;
}
