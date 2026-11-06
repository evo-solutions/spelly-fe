"use client";

import { useEffect, useRef, type RefObject } from "react";

export function WaveformCard({
  isRecording,
  isPlayingOriginal,
  isAllCorrect = false,
  hasFinishedSpeaking = false,
  hasErrors = false,
  hasRealMic,
  hasDetectedSpeech,
  toggleRecording,
  analyserRef,
  timeDataArrayRef,
}: {
  isRecording: boolean;
  isPlayingOriginal: boolean;
  isAllCorrect?: boolean;
  hasFinishedSpeaking?: boolean;
  hasErrors?: boolean;
  hasRealMic: boolean;
  hasDetectedSpeech: boolean;
  toggleRecording: () => void;
  analyserRef: RefObject<AnalyserNode | null>;
  timeDataArrayRef: RefObject<Uint8Array | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width === 0 || height === 0) return;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(canvas);
    resizeCanvas();

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (width > 0 && height > 0) {
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const centerY = height / 2;
        ctx.beginPath();

        // Waveform is purely synchronized with real microphone input
        if (
          isRecording &&
          analyserRef.current &&
          timeDataArrayRef.current
        ) {
          const analyser = analyserRef.current;
          const timeData = timeDataArrayRef.current;
          analyser.getByteTimeDomainData(timeData as Uint8Array<ArrayBuffer>);

          const sliceWidth = width / (timeData.length - 1);
          let x = 0;

          for (let i = 0; i < timeData.length; i++) {
            const v = timeData[i] / 128.0; // 1.0 is neutral baseline
            const y = centerY + (v - 1.0) * (height * 0.85);

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }
        } else {
          // Silent flat baseline when not recording or while playing sample
          ctx.moveTo(0, centerY);
          ctx.lineTo(width, centerY);
        }

        // Neon Purple Gradient Stroke & Glow
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, "#c084fc");
        grad.addColorStop(0.25, "#d946ef");
        grad.addColorStop(0.5, "#a855f7");
        grad.addColorStop(0.75, "#c026d3");
        grad.addColorStop(1, "#e879f9");

        // Outer neon glow (more intense when active recording)
        ctx.shadowColor = "#d946ef";
        ctx.shadowBlur = isRecording ? 14 : 3;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.8;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        // Inner highlight line for crispness
        ctx.shadowBlur = 4;
        ctx.shadowColor = "#f5d0fe";
        ctx.strokeStyle = "#f5d0fe";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [isRecording, analyserRef, timeDataArrayRef]);

  // Determine dot color & label based on state (synchronized with analysis card)
  let dotClass = "bg-slate-500";
  let statusText = "Đã tạm dừng ghi âm (Nhấn để tiếp tục)";

  if (isAllCorrect) {
    dotClass = "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]";
    statusText = "Đọc đúng rồi! Đang chuyển câu tiếp theo...";
  } else if (isPlayingOriginal) {
    dotClass = "bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]";
    statusText = "Đang phát âm thanh gốc... (Micro sẽ tự bật khi phát xong)";
  } else if (isRecording) {
    dotClass = "bg-rose-500 animate-ping shadow-[0_0_10px_rgba(244,63,94,0.8)]";
    statusText = hasDetectedSpeech
      ? "Đã nhận giọng nói — tự kiểm tra sau khi bạn ngừng nói"
      : "Đang thu âm — hãy đọc câu vào microphone";
  } else if (hasFinishedSpeaking && hasErrors) {
    dotClass = "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]";
    statusText = "Đã kết thúc lượt đọc (Chưa đúng hết, bấm để nghe lại)";
  } else if (hasFinishedSpeaking) {
    dotClass = "bg-slate-500";
    statusText = "Đã kết thúc lượt đọc";
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex min-w-0 flex-col items-start gap-2 px-1 text-sm sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={toggleRecording}
          disabled={isPlayingOriginal}
          className="flex min-w-0 items-start gap-2.5 text-left group cursor-pointer focus:outline-none disabled:cursor-not-allowed"
          title={
            isPlayingOriginal
              ? "Đang phát âm thanh mẫu..."
              : "Click để Bật/Tắt Micro (Phím tắt: R)"
          }
        >
          <div className="flex min-w-0 items-start gap-2.5 font-medium">
            <span className={`w-2.5 h-2.5 rounded-full transition-all ${dotClass}`} />
            <span
              className={`min-w-0 break-words font-medium tracking-wide text-xs sm:text-sm transition-colors ${
                isPlayingOriginal
                  ? "text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]"
                  : isRecording
                  ? "text-slate-200 drop-shadow-[0_0_6px_rgba(244,63,94,0.3)]"
                  : "text-slate-400"
              }`}
            >
              {statusText}
            </span>
          </div>
        </button>

        <span
          className={`break-words text-xs transition-colors sm:text-right ${
            hasRealMic ? "text-emerald-400 font-medium" : "text-amber-400/90 font-medium"
          }`}
        >
          {hasRealMic
            ? "(Microphone đã kết nối)"
            : "(Chưa cấp quyền Micro - Bấm để kết nối)"}
        </span>
      </div>

      {/* SLEEK REALTIME HTML5 CANVAS WAVEFORM CONTAINER */}
      <div className="w-full rounded-xl border relative overflow-hidden transition-all h-20 sm:h-24 card-glass-glow border-indigo-500/25 shadow-xl sm:rounded-2xl">
        {/* Background markers & grid overlay matching reference image */}
        <div className="absolute inset-0 opacity-20 pointer-events-none flex justify-between z-0">
          <span className="w-px h-full border-r border-dashed border-indigo-400" />
          <span className="w-px h-full border-r border-dashed border-rose-400" />
          <span className="w-px h-full border-r border-dashed border-emerald-400" />
          <span className="w-px h-full border-r border-dashed border-purple-400" />
          <span className="w-px h-full border-r border-dashed border-cyan-400" />
          <span className="w-px h-full border-r border-dashed border-emerald-400" />
          <span className="w-px h-full border-r border-dashed border-amber-400" />
          <span className="w-px h-full border-r border-dashed border-rose-400" />
          <span className="w-px h-full border-r border-dashed border-indigo-400" />
          <span className="w-px h-full border-r border-dashed border-rose-400" />
          <span className="w-px h-full border-r border-dashed border-emerald-400" />
          <span className="w-px h-full border-r border-dashed border-purple-400" />
          <span className="w-px h-full border-r border-dashed border-cyan-400" />
        </div>

        {/* Baseline horizontal center line */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-700/40 -translate-y-1/2 pointer-events-none z-0" />

        {/* Live Web Audio Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full relative z-10 block"
        />
      </div>
    </div>
  );
}
