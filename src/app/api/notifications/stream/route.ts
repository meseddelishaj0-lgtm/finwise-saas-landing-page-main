// src/app/api/notifications/stream/route.ts

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  let interval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Send notification every 5 seconds (example)
      interval = setInterval(() => {
        const payload = {
          id: Date.now(),
          title: "New Like",
          message: "Someone liked your post ❤️",
          time: new Date().toLocaleTimeString(),
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      }, 5000);

      controller.enqueue(encoder.encode("event: connected\ndata: ok\n\n"));
    },
    cancel() {
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
