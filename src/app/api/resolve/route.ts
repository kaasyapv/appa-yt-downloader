import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, videoQuality, isAudioOnly } = body;

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const quality = isAudioOnly
      ? "bestaudio"
      : `bestvideo[height<=${videoQuality || "720"}]+bestaudio/best[height<=${videoQuality || "720"}]`;

    const apiUrl = `https://yozora.vercel.app/api/download?url=${encodeURIComponent(url)}&format=${encodeURIComponent(quality)}`;

    return NextResponse.json({ status: "ok", url: apiUrl });

  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
