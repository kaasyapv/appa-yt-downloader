from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import yt_dlp, os, tempfile, re

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health(): return {"ok": True}

@app.get("/download")
def download(url: str = Query(...), quality: str = Query("720"), audio_only: str = Query("false")):
    is_audio = audio_only.lower() == "true"
    tmpdir = tempfile.mkdtemp()

    if is_audio:
        opts = {
            "format": "bestaudio/best",
            "outtmpl": f"{tmpdir}/%(title)s.%(ext)s",
            "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}],
            "quiet": True,
        }
        ext = "mp3"
        mime = "audio/mpeg"
    else:
        opts = {
            "format": f"bestvideo[height<={quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<={quality}]",
            "outtmpl": f"{tmpdir}/%(title)s.%(ext)s",
            "merge_output_format": "mp4",
            "quiet": True,
        }
        ext = "mp4"
        mime = "video/mp4"

    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = re.sub(r"[^\w\s-]", "_", info.get("title", "download"))[:80]

    files = [f for f in os.listdir(tmpdir) if f.endswith(f".{ext}")]
    if not files:
        return {"error": "No file produced"}

    filepath = os.path.join(tmpdir, files[0])

    def stream():
        with open(filepath, "rb") as f:
            yield from iter(lambda: f.read(65536), b"")

    return StreamingResponse(stream(), media_type=mime, headers={
        "Content-Disposition": f'attachment; filename="{title}.{ext}"'
    })
```

Then create `backend/requirements.txt`:
```
fastapi
uvicorn[standard]
yt-dlp
```

Then create `backend/Procfile`:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
