import { NextRequest, NextResponse } from "next/server";

const BACKEND = "https://appa-yt-downloader-production.up.railway.app";

export async function POST(req: NextRequest) {
  try {
    const { url, videoQuality, isAudioOnly } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const downloadUrl = `${BACKEND}/download?url=${encodeURIComponent(url)}&quality=${videoQuality || "720"}&audio_only=${isAudioOnly ? "true" : "false"}`;

    return NextResponse.json({ status: "ok", url: downloadUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
