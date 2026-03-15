import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, isAudioOnly } = body;

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    // Extract video ID
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const videoId = match?.[1];

    if (!videoId) {
      return NextResponse.json({ error: "Could not parse YouTube video ID" }, { status: 400 });
    }

    // Return redirect URLs — client will open one in a new tab
    const redirectUrls = isAudioOnly
      ? [
          `https://cnvmp3.com/v6/?url=${encodeURIComponent(url)}`,
          `https://ytmp3.cc/en13/`,
        ]
      : [
          `https://ssyoutube.com/en13/download?url=${encodeURIComponent(url)}`,
          `https://y2mate.industries/en13/?url=${encodeURIComponent(url)}`,
        ];

    return NextResponse.json({
      status: "redirect",
      redirectUrl: redirectUrls[0],
      fallbackUrl: redirectUrls[1],
      message: "Opening download page…",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
