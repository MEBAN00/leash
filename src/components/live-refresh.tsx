"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Subscribes to the server's event stream and re-renders the page's server
 * components whenever something relevant happens. Pages stay plain server
 * components; this just tells them when to refresh.
 */
export function LiveRefresh({ runId, types }: { runId?: string; types?: string[] }) {
  const router = useRouter();
  const typeKey = types?.join(",") ?? "";

  useEffect(() => {
    const url = runId ? `/api/events?runId=${encodeURIComponent(runId)}` : "/api/events";
    const source = new EventSource(url);
    const prefixes = typeKey ? typeKey.split(",") : null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    source.onmessage = (msg) => {
      const event = JSON.parse(msg.data) as { type: string };
      if (prefixes && !prefixes.some((t) => event.type.startsWith(t))) return;
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 120);
    };

    return () => {
      clearTimeout(timer);
      source.close();
    };
  }, [router, runId, typeKey]);

  return null;
}
