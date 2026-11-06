"use client";

import { useState } from "react";

export function SessionHeader({
  conversationId = "0",
  speakerLabel = "Speaker A",
  role = "1",
  turnIndex = 0,
  totalTurns = 12,
  isPlayingOriginal = false,
  hasPlayedCurrent = false,
  onReplay,
  onNext,
  onPrev,
}: {
  conversationId?: string;
  label?: string;
  title?: string;
  speakerLabel?: string;
  role?: "0" | "1";
  turnIndex?: number;
  totalTurns?: number;
  isPlayingOriginal?: boolean;
  hasPlayedCurrent?: boolean;
  onReplay: () => void;
  onNext: () => void;
  onPrev?: () => void;
}) {
  const [clickActive, setClickActive] = useState(false);
  const [nextActive, setNextActive] = useState(false);
  const [prevActive, setPrevActive] = useState(false);

  const handleReplay = () => {
    setClickActive(true);
    setTimeout(() => setClickActive(false), 400);
    onReplay();
  };

  const handleNext = () => {
    setNextActive(true);
    setTimeout(() => setNextActive(false), 400);
    onNext();
  };

  const handlePrev = () => {
    if (!onPrev) return;
    setPrevActive(true);
    setTimeout(() => setPrevActive(false), 400);
    onPrev();
  };

  const isSpeakerA = role === "1";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-slate-800/70">
      {/* Thông tin hiển thị trên cùng 1 dòng: DailyTalk #0 · Câu 03/12 · [Speaker A] */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
        {/* Tên bộ hội thoại với gradient phát sáng */}
        <span className="font-bold bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] text-base sm:text-lg font-sans tracking-wide">
          DailyTalk #{conversationId}
        </span>

        <span className="text-slate-600 font-light text-sm select-none">·</span>

        {/* Thứ tự câu trên tổng số câu */}
        <span className="text-white font-bold text-sm sm:text-base tracking-wide font-sans">
          Câu {String(turnIndex + 1).padStart(2, "0")}/{totalTurns}
        </span>

        {/* Badge vai trò người nói (Speaker A vs Speaker B) */}
        <span
          className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border tracking-wide shadow-sm transition-all ${
            isSpeakerA
              ? "bg-indigo-950/90 border-indigo-400/60 text-indigo-300 shadow-[0_0_10px_rgba(129,140,248,0.25)]"
              : "bg-teal-950/90 border-teal-400/60 text-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.25)]"
          }`}
        >
          {speakerLabel}
        </span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 self-end sm:self-auto">
        {/* Button: Prev Audio (Câu trước) */}
        {onPrev && (
          <div className="relative group">
            <button
              type="button"
              aria-label="Quay lại câu trước"
              onClick={handlePrev}
              disabled={turnIndex === 0}
              className={`btn-action-glow w-10 h-10 rounded-xl bg-gradient-to-b from-[#232f48] to-[#151f33] hover:from-[#2e3e60] hover:to-[#1c2944] text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-400/60 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md shadow-black/40 group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                prevActive ? "ring-2 ring-indigo-400" : ""
              }`}
            >
              <svg
                className="w-4 h-4 text-indigo-300 group-hover:text-indigo-200 group-hover:-translate-x-0.5 transition-all duration-200 filter drop-shadow-[0_0_6px_rgba(165,180,252,0.4)]"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <polygon fill="currentColor" fillOpacity="0.3" points="19 20 9 12 19 4 19 20" />
                <line x1="5" x2="5" y1="19" y2="5" />
              </svg>
            </button>
            <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900/95 border border-slate-700/80 px-2 py-0.5 text-xs font-normal text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 shadow-lg">
              Câu trước
            </span>
          </div>
        )}

        {/* Button: Replay (Phát lại mẫu âm thanh) */}
        <div className="relative group">
          <button
            type="button"
            aria-label={hasPlayedCurrent ? "Phát lại mẫu âm thanh" : "Phát mẫu âm thanh"}
            onClick={handleReplay}
            className={`btn-action-glow w-10 h-10 rounded-xl bg-gradient-to-b from-[#232f48] to-[#151f33] hover:from-[#2e3e60] hover:to-[#1c2944] text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-400/60 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md shadow-black/40 group cursor-pointer ${
              isPlayingOriginal || clickActive ? "ring-2 ring-indigo-400 border-indigo-400" : ""
            }`}
          >
            {hasPlayedCurrent ? (
              <svg
                className={`w-4 h-4 text-indigo-300 group-hover:text-indigo-200 group-hover:rotate-[-45deg] transition-all duration-200 filter drop-shadow-[0_0_6px_rgba(165,180,252,0.4)] ${
                  isPlayingOriginal ? "animate-spin" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 translate-x-px text-indigo-300 transition-all duration-200 filter drop-shadow-[0_0_6px_rgba(165,180,252,0.4)]"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M7.5 4.8c0-1.1 1.2-1.8 2.2-1.2l10.1 6.2a2.6 2.6 0 0 1 0 4.4L9.7 20.4c-1 .6-2.2-.1-2.2-1.2V4.8Z" />
              </svg>
            )}
          </button>
          <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900/95 border border-slate-700/80 px-2 py-0.5 text-xs font-normal text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 shadow-lg">
            {isPlayingOriginal ? "Đang phát..." : hasPlayedCurrent ? "Replay" : "Play"}
          </span>
        </div>

        {/* Button: Next */}
        <div className="relative group">
          <button
            type="button"
            aria-label="Phát câu kế tiếp"
            onClick={handleNext}
            className={`btn-action-glow w-10 h-10 rounded-xl bg-gradient-to-b from-[#232f48] to-[#151f33] hover:from-[#2e3e60] hover:to-[#1c2944] text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-400/60 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md shadow-black/40 group cursor-pointer ${
              nextActive ? "ring-2 ring-indigo-400" : ""
            }`}
          >
            <svg
              className="w-4 h-4 text-indigo-300 group-hover:text-indigo-200 group-hover:translate-x-0.5 transition-all duration-200 filter drop-shadow-[0_0_6px_rgba(165,180,252,0.4)]"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <polygon fill="currentColor" fillOpacity="0.3" points="5 4 15 12 5 20 5 4" />
              <line x1="19" x2="19" y1="5" y2="19" />
            </svg>
          </button>
          <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900/95 border border-slate-700/80 px-2 py-0.5 text-xs font-normal text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 shadow-lg">
            Câu tiếp
          </span>
        </div>
      </div>
    </div>
  );
}
