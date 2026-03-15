"use client";

import { useState, useRef } from "react";
import styles from "./page.module.css";

type Mode = "video" | "playlist" | "audio";
type AppState = "idle" | "fetching" | "ready" | "resolving" | "done" | "error";

interface VideoInfo {
  title: string;
  thumbnail: string;
  thumbnailFallback?: string;
  duration: string;
  isPlaylist: boolean;
}

const QUALITIES = ["360", "480", "720", "1080", "1440", "2160"] as const;
type Quality = (typeof QUALITIES)[number];

export default function Home() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [state, setState] = useState<AppState>("idle");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [quality, setQuality] = useState<Quality>("720");
  const [errMsg, setErrMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [thumbError, setThumbError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setState("idle");
    setInfo(null);
    setErrMsg("");
    setStatusMsg("");
    setMode(null);
    setThumbError(false);
  };

  const isValidYT = (u: string) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(u.trim());

  const handleAction = async (selectedMode: Mode) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setErrMsg("Paste a YouTube link first.");
      setState("error");
      return;
    }
    if (!isValidYT(trimmed)) {
      setErrMsg("That doesn't look like a YouTube URL.");
      setState("error");
      return;
    }

    setMode(selectedMode);
    setState("fetching");
    setStatusMsg("");
    setErrMsg("");
    setInfo(null);
    setThumbError(false);

    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Could not load video info");

      if (selectedMode === "playlist" && !data.isPlaylist) {
        // Single video link with playlist mode — warn but allow
        setInfo({ ...data, isPlaylist: false });
      } else {
        setInfo(data);
      }
      setState("ready");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Failed to fetch info.");
      setState("error");
    }
  };

  const startDownload = async () => {
    if (!info || !mode) return;
    setState("resolving");
    setStatusMsg("Getting download link…");

    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          videoQuality: quality,
          isAudioOnly: mode === "audio",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not get download link");

      // Trigger download via anchor
      const a = document.createElement("a");
      a.href = data.url;
      a.download = data.filename || "download";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setState("done");
      setStatusMsg("Download started!");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Download failed.");
      setState("error");
    }
  };

  const isBusy = state === "fetching" || state === "resolving";

  return (
    <main className={styles.main}>
      <div className={styles.orb1} aria-hidden />
      <div className={styles.orb2} aria-hidden />
      <div className={styles.grid} aria-hidden />

      <div className={styles.shell}>
        {/* ── Title ── */}
        <header className={styles.header}>
          <div className={styles.logoMark} aria-hidden>
            <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="10" fill="url(#lg)" />
              <path d="M14 11.5L25 18L14 24.5V11.5Z" fill="white" />
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FF4B4B" />
                  <stop offset="1" stopColor="#C0000F" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className={styles.title}>
            <span className={styles.titleAppa}>Appa's</span>
            <span className={styles.titleMain}>YT Downloader</span>
          </h1>
        </header>

        {/* ── Input ── */}
        <div className={styles.inputWrap}>
          <div className={styles.inputRow}>
            <span className={styles.inputIcon} aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <input
              ref={inputRef}
              className={styles.input}
              type="url"
              placeholder="Paste link"
              value={url}
              onChange={(e) => { setUrl(e.target.value); if (state !== "idle") reset(); }}
              onKeyDown={(e) => e.key === "Enter" && handleAction("video")}
              spellCheck={false}
              autoComplete="off"
              disabled={isBusy}
            />
            {url && !isBusy && (
              <button
                className={styles.clearBtn}
                onClick={() => { setUrl(""); reset(); inputRef.current?.focus(); }}
                aria-label="Clear"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className={styles.actions}>
          {(["video", "playlist", "audio"] as Mode[]).map((m) => (
            <button
              key={m}
              className={`${styles.actionBtn} ${mode === m && state !== "error" ? styles.actionActive : ""}`}
              onClick={() => handleAction(m)}
              disabled={isBusy}
            >
              <span className={styles.actionIcon} aria-hidden>
                {m === "video" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
                {m === "playlist" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                )}
                {m === "audio" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                )}
              </span>
              <span className={styles.actionLabel}>
                {m === "video" ? "Download Video" : m === "playlist" ? "Download Playlist" : "Download Audio"}
              </span>
            </button>
          ))}
        </div>

        {/* ── Status / Loading ── */}
        {isBusy && (
          <div className={styles.statusRow}>
            <span className={styles.loader} aria-hidden />
            <span className={styles.statusText}>
              {state === "fetching" ? "Fetching info…" : statusMsg}
            </span>
          </div>
        )}

        {/* ── Error ── */}
        {state === "error" && errMsg && (
          <div className={styles.errorRow}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errMsg}
          </div>
        )}

        {/* ── Info + Download Panel ── */}
        {(state === "ready" || state === "done") && info && (
          <div className={styles.panel}>
            <div className={styles.panelThumb}>
              <img
                src={thumbError ? (info.thumbnailFallback || "") : info.thumbnail}
                alt=""
                className={styles.thumbImg}
                onError={() => setThumbError(true)}
              />
              <div className={styles.thumbOverlay} aria-hidden />
            </div>
            <div className={styles.panelBody}>
              <p className={styles.panelTitle}>{info.title}</p>
              {info.duration && <p className={styles.panelDur}>{info.duration}</p>}
              {info.isPlaylist && (
                <p className={styles.panelNote}>Public playlist · all videos</p>
              )}

              {/* Quality selector — only for video */}
              {mode === "video" && (
                <div className={styles.qualityRow}>
                  {QUALITIES.map((q) => (
                    <button
                      key={q}
                      className={`${styles.qualBtn} ${quality === q ? styles.qualActive : ""}`}
                      onClick={() => setQuality(q)}
                      disabled={isBusy}
                    >
                      {q === "2160" ? "4K" : `${q}p`}
                    </button>
                  ))}
                </div>
              )}

              <button
                className={`${styles.dlBtn} ${state === "done" ? styles.dlDone : ""}`}
                onClick={startDownload}
                disabled={state === "resolving" || state === "done"}
              >
                {state === "resolving" ? (
                  <><span className={styles.loaderSm} /> Getting link…</>
                ) : state === "done" ? (
                  <><span aria-hidden>✓</span> Download started</>
                ) : mode === "audio" ? (
                  "Get MP3"
                ) : mode === "playlist" ? (
                  "Download Playlist"
                ) : (
                  `Download ${quality === "2160" ? "4K" : quality + "p"}`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
