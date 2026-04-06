type StreamSseOptions = {
  url: string;
  token: string;
  body: unknown;
  signal?: AbortSignal;
  onEvent: (event: { event: string; data: string }) => void;
};

export async function streamSse({ url, token, body, signal, onEvent }: StreamSseOptions) {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = (await response.json()) as { detail?: string };
      message = data.detail ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming not supported by this browser");
  }

  const decoder = new TextDecoder();

  let buffer = "";
  let currentEvent = "message";
  let currentData = "";

  function flushEvent() {
    if (!currentData) return;
    onEvent({ event: currentEvent, data: currentData.replace(/\n$/, "") });
    currentEvent = "message";
    currentData = "";
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundaryIndex = buffer.indexOf("\n\n");
    while (boundaryIndex !== -1) {
      const raw = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);

      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        if (!line) continue;
        if (line.startsWith(":")) continue;

        if (line.startsWith("event:")) {
          currentEvent = line.slice("event:".length).trim() || "message";
          continue;
        }

        if (line.startsWith("data:")) {
          currentData += line.slice("data:".length).trimStart() + "\n";
        }
      }

      flushEvent();
      boundaryIndex = buffer.indexOf("\n\n");
    }
  }

  if (currentData) {
    flushEvent();
  }
}

