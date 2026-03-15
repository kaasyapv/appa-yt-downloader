import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, videoQuality, isAudioOnly } = body;

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const quality = videoQuality || "720";

    const redirectUrl = isAudioOnly
      ? `https://cnvmp3.com/v6/?url=${encodeURIComponent(url)}`
      : `https://ssyoutube.com/en13/download?url=${encodeURIComponent(url)}&quality=${quality}p`;

    return NextResponse.json({ status: "redirect", redirectUrl });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
