import { NextRequest, NextResponse } from "next/server";

// Community cobalt instances - rotated for reliability
// These are open community instances. See: https://instances.cobalt.best
const COBALT_INSTANCES = [
  "https://cobalt.api.timelessnesses.me",
  "https://cobalt.ggtyler.dev",
  "https://cobalt-api.asm.al",
  "https://api.cobalt.tools",
];

async function tryInstance(
  instance: string,
  body: object,
  timeout = 12000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${instance}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, videoQuality, isAudioOnly } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const cobaltPayload = {
      url,
      videoQuality: videoQuality || "720",
      audioFormat: "mp3",
      isAudioOnly: isAudioOnly || false,
      filenameStyle: "pretty",
      downloadMode: isAudioOnly ? "audio" : "auto",
    };

    let lastError = "";

    for (const instance of COBALT_INSTANCES) {
      try {
        const res = await tryInstance(instance, cobaltPayload);
        const data = await res.json();

        if (data.status === "error") {
          lastError = data.error?.code || "Unknown error";
          continue;
        }

        if (data.status === "tunnel" || data.status === "redirect") {
          return NextResponse.json({
            status: "ok",
            url: data.url,
            filename: data.filename,
          });
        }

        lastError = `Unexpected status: ${data.status}`;
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Instance failed";
        continue;
      }
    }

    return NextResponse.json(
      { error: `All instances failed. Last: ${lastError}` },
      { status: 502 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
