import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, videoQuality, isAudioOnly } = body;

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const format = isAudioOnly ? "mp3" : "mp4";
    const quality = isAudioOnly ? "128" : (videoQuality || "720");

    // Step 1: Request conversion
    const convertRes = await fetch(
      `https://loader.to/ajax/download.php?format=${format}&url=${encodeURIComponent(url)}`,
      { headers: { "Accept": "application/json" } }
    );

    if (!convertRes.ok) throw new Error("Conversion service unavailable");
    const convertData = await convertRes.json();

    if (!convertData.id) throw new Error("Could not start conversion");

    const id = convertData.id;

    // Step 2: Poll for completion (max 30 seconds)
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));

      const progressRes = await fetch(
        `https://loader.to/ajax/progress.php?id=${id}`,
        { headers: { "Accept": "application/json" } }
      );

      if (!progressRes.ok) continue;
      const progressData = await progressRes.json();

      if (progressData.download_url) {
        return NextResponse.json({
          status: "ok",
          url: progressData.download_url,
          filename: `download.${format}`,
        });
      }

      if (progressData.success === 0) throw new Error("Conversion failed");
    }

    throw new Error("Conversion timed out. Try a shorter video.");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
