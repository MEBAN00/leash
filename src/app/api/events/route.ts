import { subscribe } from "@/lib/events";

export const dynamic = "force-dynamic";

/** Server-Sent Events: every audit event as it happens, optionally for one run. */
export async function GET(request: Request) {
  const runId = new URL(request.url).searchParams.get("runId");
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // stream already closed
        }
      };
      send("retry: 2000\n\n");

      const unsubscribe = subscribe((e) => {
        if (runId && e.runId !== runId) return;
        send(`data: ${JSON.stringify({ id: e.id, type: e.type, runId: e.runId })}\n\n`);
      });
      const ping = setInterval(() => send(": ping\n\n"), 15_000);

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
