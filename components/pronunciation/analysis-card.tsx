"use client";

import { WordChip } from "@/components/ui/word-chip";
import type { SpokenWordItem } from "@/components/pronunciation/lessons";

export function AnalysisCard({
  spokenWords,
  isRecording,
  hasDetectedSpeech,
  isPlayingOriginal,
  isAllCorrect,
  hasFinishedSpeaking,
  onWordClick,
  aiStatus = "idle",
  aiTranscript,
  aiError,
}: {
  spokenWords: SpokenWordItem[];
  totalTarget?: number;
  isRecording: boolean;
  hasDetectedSpeech: boolean;
  isPlayingOriginal: boolean;
  isAllCorrect: boolean;
  hasErrors?: boolean;
  hasFinishedSpeaking: boolean;
  onStopRecording?: () => void;
  onStartRecording?: () => void;
  onStopAndReplay?: () => void;
  onWordClick?: (word: string) => void;
  aiStatus?: "idle" | "checking" | "done" | "error";
  aiTranscript?: string | null;
  aiError?: string;
}) {
  return (
    <div className="w-full card-glass-glow rounded-xl sm:rounded-2xl border border-indigo-500/25 hover:border-indigo-400/40 p-5 sm:p-7 shadow-xl flex flex-col gap-4 transition-colors relative">
      {/* Vùng hiển thị từ vựng caption theo thời gian thực */}
      <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-3.5 sm:gap-y-4.5 min-h-[48px]">
        {/* Khi chưa nói từ nào: hiển thị trạng thái chờ nhẹ nhàng */}
        {spokenWords.length === 0 ? (
          <div className="flex items-center gap-2.5 text-slate-400 text-sm py-2 italic select-none">
            {isPlayingOriginal ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-300/85">
                  Đang phát âm thanh gốc... Hãy lắng nghe để chuẩn bị phát âm
                </span>
              </>
            ) : isRecording ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-slate-300">
                  {hasDetectedSpeech
                    ? "Đã nhận giọng nói. Sẽ tự dừng và kiểm tra sau khi bạn ngừng nói."
                    : "Đang thu âm. Hãy đọc câu; hệ thống sẽ tự phát hiện và kiểm tra khi bạn ngừng nói."}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>
                  Microphone đang tắt. Bấm Replay để nghe và bắt đầu nói.
                </span>
              </>
            )}
          </div>
        ) : (
          // Khi người dùng đã nói: hiển thị các từ nhận diện được theo thời gian thực
          spokenWords.map((item) => (
            <button
              key={`${item.word}-${item.index}`}
              type="button"
              onClick={() => {
                if (!item.isMissing) onWordClick?.(item.word);
              }}
              className="cursor-pointer focus:outline-none inline-flex"
              title={
                item.isMissing
                  ? `Bỏ lỡ từ "${item.word}"`
                  : `Bấm để nghe phát âm mẫu từ: "${item.word}"`
              }
            >
              <WordChip word={item.word} status={item.status} />
            </button>
          ))
        )}

        {/* Dấu 3 chấm: CHỈ hiển thị khi đang thu âm/analysis. Khi đã nói xong (kể cả sai hay đúng) hoặc khi tắt ghi âm thì KHÔNG hiển thị */}
        {isRecording && !hasFinishedSpeaking && !isAllCorrect && (
          <div
            className="flex items-center gap-1.5 pl-2 text-indigo-400/60"
            id="listening-indicator"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse [animation-delay:0.4s]" />
          </div>
        )}
      </div>
      {aiStatus === "checking" && (
        <p role="status" className="text-sm text-indigo-200">
          Đang dùng OpenAI kiểm tra toàn bộ câu nói...
        </p>
      )}
      {aiStatus === "done" && (
        <p className="text-sm text-slate-300">
          OpenAI nghe được:{" "}
          <span className="text-white">
            {aiTranscript || "(không nhận ra lời nói)"}
          </span>
        </p>
      )}
      {aiStatus === "error" && (
        <p role="alert" className="text-sm text-rose-300">
          Không thể kiểm tra bằng OpenAI: {aiError}
        </p>
      )}
    </div>
  );
}
