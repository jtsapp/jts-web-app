"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
const ignoreUntil = { t: 0 };
function ignoreLeaves(ms) {
  ignoreUntil.t = Date.now() + ms;
}
function useProctor(token, stage, warnAfter, initialLeaves = 0) {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [warn, setWarn] = useState(false);
  const queue = useRef([]);
  const last = useRef(0);
  useEffect(() => {
    if (!stage) return;
    const push = (kind) => {
      queue.current.push({ stage, kind, at: Date.now() });
    };
    const flush = () => {
      if (!queue.current.length) return;
      const batch = queue.current.splice(0, queue.current.length);
      api.proctor(token, batch).catch(() => {
        queue.current.unshift(...batch);
      });
    };
    const onLeave = () => {
      const t = Date.now();
      if (t < ignoreUntil.t || t - last.current <= 1500) return;
      last.current = t;
      push("leave");
      setLeaves((n) => {
        const next = n + 1;
        if (next >= warnAfter) setWarn(true);
        return next;
      });
      flush();
    };
    const onVis = () => {
      if (document.hidden) onLeave();
    };
    const onFocus = () => setTimeout(() => {
      ignoreUntil.t = 0;
    }, 300);
    const onCopy = (e) => {
      e.preventDefault();
      push("copy");
    };
    const onCut = (e) => {
      e.preventDefault();
    };
    const onPaste = (e) => {
      e.preventDefault();
      push("paste");
      window.dispatchEvent(new CustomEvent("proctor-paste"));
    };
    const onMenu = (e) => e.preventDefault();
    const onFs = () => {
      if (!document.fullscreenElement) push("fullscreen");
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onLeave);
    window.addEventListener("focus", onFocus);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onMenu);
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("pagehide", flush);
    const timer = setInterval(flush, 5e3);
    return () => {
      flush();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onMenu);
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("pagehide", flush);
    };
  }, [token, stage, warnAfter]);
  return { leaves, warn, dismiss: () => setWarn(false) };
}
function useWebcamSnapshots(token, stage, enabled) {
  useEffect(() => {
    if (!enabled || !stage || !navigator.mediaDevices?.getUserMedia) return;
    let stream = null;
    let stopped = false;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    const shoot = () => {
      if (!stream || stopped) return;
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      canvas.getContext("2d")?.drawImage(video, 0, 0, 320, 240);
      canvas.toBlob((b) => {
        if (b) api.snapshot(token, stage, b).catch(() => {
        });
      }, "image/jpeg", 0.7);
    };
    ignoreLeaves(15e3);
    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false }).then((s) => {
      if (stopped) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = s;
      video.srcObject = s;
      video.play().catch(() => {
      });
      setTimeout(shoot, 3e3);
    }).catch(() => {
    });
    const timer = setInterval(shoot, 6e4);
    const onVis = () => {
      if (document.hidden) shoot();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [token, stage, enabled]);
}
export {
  ignoreLeaves,
  useProctor,
  useWebcamSnapshots
};
