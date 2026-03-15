import { NextRequest, NextResponse } from "next/server";

function parseYouTubeId(url: string): { id: string | null; isPlaylist: boolean; playlistId: string | null } {
  try {
    const u = new URL(url);
    const playlistId = u.searchParams.get("list");
    const videoId =
      u.searchParams.get("v") ||
      (u.hostname === "youtu.be" ? u.pathname.slice(1) : null);
    return {
      id: videoId,
      isPlaylist: !!playlistId && !videoId,
      playlistId,
    };
  } catch {
    return { id: null, isPlaylist: false, playlistId: null };
  }
}

function formatSeconds(s: number): string {
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || "";

  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  const parsed = parseYouTubeId(url);

  if (parsed.isPlaylist && parsed.playlistId) {
    // For playlists, use the YouTube oEmbed + a public playlist details trick
    const playlistThumb = `https://img.youtube.com/vi/default/maxresdefault.jpg`;
    return NextResponse.json({
      title: "YouTube Playlist",
      thumbnail: playlistThumb,
      duration: "Multiple videos",
      isPlaylist: true,
      playlistId: parsed.playlistId,
    });
  }

  if (!parsed.id) {
    return NextResponse.json({ error: "Could not parse YouTube URL" }, { status: 400 });
  }

  // Use YouTube oEmbed — free, no API key required
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { next: { revalidate: 3600 } });

    if (!res.ok) {
      return NextResponse.json({ error: "Video unavailable or private" }, { status: 404 });
    }

    const data = await res.json();

    // Highest-res thumbnail
    const thumb = `https://img.youtube.com/vi/${parsed.id}/maxresdefault.jpg`;

    return NextResponse.json({
      title: data.title || "YouTube Video",
      thumbnail: thumb,
      thumbnailFallback: data.thumbnail_url,
      duration: "",
      isPlaylist: false,
      videoId: parsed.id,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch info" },
      { status: 500 }
    );
  }
}
