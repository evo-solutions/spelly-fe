"use client";

import { useState } from "react";
import type { Lesson } from "@/components/pronunciation/lessons";

function LightbulbIcon() {
  return (
    <svg
      className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform filter drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm-3 18c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-16c2.76 0 5 2.24 5 5 0 1.63-.8 3.16-2.15 4.1l-.85.6V16h-4v-4.3l-.85-.6C7.8 10.16 7 8.63 7 7c0-2.76 2.24-5 5-5z" />
    </svg>
  );
}

export function HintCard({ lesson }: { lesson: Lesson }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-b from-[#25324c] to-[#151f33] hover:from-[#2e3e60] hover:to-[#1b2742] text-amber-300 border border-amber-500/35 hover:border-amber-400/60 text-sm font-medium transition-all active:scale-95 shadow-md shadow-black/30 group cursor-pointer"
        >
          <LightbulbIcon />
          <span className="tracking-wide font-medium">Hint &amp; Reference</span>
        </button>
      </div>

      {isOpen && (
        <div className="card-glass-glow rounded-xl sm:rounded-2xl border border-indigo-500/20 hover:border-indigo-500/30 p-5 sm:p-6 lg:p-7 flex flex-col gap-4 transition-all">
          {/* Target sentence */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-white uppercase font-sans">
              <span>1. TARGET SENTENCE</span>
            </div>
            <div className="pl-3.5">
              <p className="break-words text-base font-normal text-white tracking-wide font-sans">
                {lesson.sentence}
              </p>
            </div>
          </div>

          {/* Phonetic (IPA) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-white uppercase font-sans">
              <span>2. PHONETIC (IPA)</span>
            </div>
            <div className="pl-3.5">
              <p className="break-words text-base font-normal text-white tracking-wide font-sans">
                {lesson.ipa}
              </p>
            </div>
          </div>

          {/* Meaning */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-white uppercase font-sans">
              <span>3. MEANING</span>
            </div>
            <div className="pl-3.5">
              <p className="break-words text-base font-medium text-white leading-relaxed font-sans not-italic">
                {lesson.vietnamese}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
