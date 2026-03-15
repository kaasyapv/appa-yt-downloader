from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import yt_dlp, os, tempfile, re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/download")
def download(
    url: str = Query(...),
    quality: str = Query("720"),
    audio_only: str = Query("false")
):
    try:
        is_audio = audio_only.lower() == "true"
        tmpdir = tempfile.mkdtemp()

        if is_audio:
            opts = {
                "format": "bestaudio[ext=m4a]/bestaudio/best",
                "outtmpl": f"{tmpdir}/%(title)s.%(ext)s",
                "quiet": True,
                "no_warnings": True,
            }
        else:
            # Single file format — no ffmpeg merging needed
            opts = {
                "format": f"best[height<={quality}][ext=mp4]/best[height<={quality}]/best",
                "outtmpl": f"{tmpdir}/%(title)s.%(ext)s",
                "quiet": True,
                "no_warnings": True,
            }

        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = re.sub(r"[^\w\s-]", "_", info.get("title", "download"))[:80]

        files = os.listdir(tmpdir)
        if not files:
            return JSONResponse({"error": "No file produced"}, status_code=500)

        filepath = os.path.join(tmpdir, files[0])
        ext = files[0].split(".")[-1]
        mime = "audio/mp4" if is_audio else "video/mp4"

        def stream():
            with open(filepath, "rb") as f:
                yield from iter(lambda: f.read(65536), b"")

        return StreamingResponse(stream(), media_type=mime, headers={
            "Content-Disposition": f'attachment; filename="{title}.{ext}"'
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
