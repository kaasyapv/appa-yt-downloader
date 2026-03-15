"""
Appa's YT Downloader — Backend
FastAPI + yt-dlp

Deploy this on Railway or Render (free tier).
Set ALLOWED_ORIGIN env var to your Vercel frontend URL.
"""

import os
import re
import tempfile
import subprocess
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import yt_dlp

app = FastAPI(title="Appa's YT Downloader API")

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


def is_valid_youtube_url(url: str) -> bool:
    patterns = [
        r"(https?://)?(www\.)?(youtube\.com|youtu\.be)/.+",
    ]
    return any(re.match(p, url) for p in patterns)


def format_duration(seconds: Optional[int]) -> str:
    if not seconds:
        return ""
    h, rem = divmod(int(seconds), 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def safe_filename(name: str) -> str:
    return re.sub(r'[^\w\s\-.]', '_', name)[:120]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/info")
def get_info(
    url: str = Query(..., description="YouTube URL"),
    mode: str = Query("video", description="video | playlist | audio"),
):
    if not is_valid_youtube_url(url):
        raise HTTPException(400, "Invalid YouTube URL")

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": mode != "playlist",
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        if mode == "playlist" and info.get("_type") == "playlist":
            entries = info.get("entries", [])
            return {
                "title": info.get("title", "Playlist"),
                "thumbnail": entries[0].get("thumbnail") if entries else "",
                "duration": f"{len(entries)} videos",
                "is_playlist": True,
            }

        return {
            "title": info.get("title", "Video"),
            "thumbnail": info.get("thumbnail", ""),
            "duration": format_duration(info.get("duration")),
            "is_playlist": False,
        }

    except yt_dlp.utils.DownloadError as e:
        msg = str(e)
        if "private" in msg.lower():
            raise HTTPException(403, "This video/playlist is private")
        if "unavailable" in msg.lower():
            raise HTTPException(404, "Video unavailable")
        raise HTTPException(400, f"Could not fetch info: {msg}")
    except Exception as e:
        raise HTTPException(500, f"Server error: {str(e)}")


@app.get("/download")
def download(
    url: str = Query(...),
    mode: str = Query("video"),
    quality: str = Query("720"),
):
    if not is_valid_youtube_url(url):
        raise HTTPException(400, "Invalid YouTube URL")

    tmpdir = tempfile.mkdtemp()
    out_template = str(Path(tmpdir) / "%(title)s.%(ext)s")

    if mode == "audio":
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": out_template,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }],
            "quiet": True,
            "noplaylist": True,
        }
        ext = "mp3"

    elif mode == "playlist":
        ydl_opts = {
            "format": f"bestvideo[height<={quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<={quality}][ext=mp4]/best",
            "outtmpl": out_template,
            "merge_output_format": "mp4",
            "quiet": True,
            "noplaylist": False,
            "playlistend": 50,  # safety cap
        }
        ext = "zip"

    else:  # video
        ydl_opts = {
            "format": f"bestvideo[height<={quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<={quality}][ext=mp4]/best",
            "outtmpl": out_template,
            "merge_output_format": "mp4",
            "quiet": True,
            "noplaylist": True,
        }
        ext = "mp4"

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = safe_filename(info.get("title", "download"))

        files = list(Path(tmpdir).glob(f"*.{ext if ext != 'zip' else '*'}"))

        if not files:
            raise HTTPException(404, "Download produced no file")

        if mode == "playlist":
            import zipfile
            zip_path = str(Path(tmpdir) / "playlist.zip")
            with zipfile.ZipFile(zip_path, "w") as zf:
                for f in Path(tmpdir).glob("*"):
                    if f.suffix in (".mp4", ".webm", ".mkv"):
                        zf.write(f, f.name)
            return FileResponse(
                zip_path,
                media_type="application/zip",
                filename=f"{title}_playlist.zip",
                background=None,
            )

        file_path = files[0]
        media_type = "audio/mpeg" if ext == "mp3" else "video/mp4"
        return FileResponse(
            str(file_path),
            media_type=media_type,
            filename=f"{title}.{ext}",
        )

    except yt_dlp.utils.DownloadError as e:
        raise HTTPException(400, f"Download failed: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Server error: {str(e)}")
