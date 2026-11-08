"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnalysisCard } from "@/components/pronunciation/analysis-card";
import { HintCard } from "@/components/pronunciation/hint-card";
import {
  evaluateSpokenWords,
  type Lesson,
} from "@/components/pronunciation/lessons";
import { SessionHeader } from "@/components/pronunciation/session-header";
import { useMicrophone } from "@/components/pronunciation/use-microphone";
import { WaveformCard } from "@/components/pronunciation/waveform-card";
import {
  useDailyTalkStore,
  type ConversationOption,
} from "@/lib/dailytalk-store";

export function PracticeSession() {
  const initialLoadStartedRef = useRef(false);
  const conversationOptions = useDailyTalkStore((state) => state.conversationOptions);
  const hasMoreConversationOptions = useDailyTalkStore(
    (state) => state.hasMoreConversationOptions
  );
  const isLoadingOptions = useDailyTalkStore((state) => state.isLoadingOptions);
  const conversationOptionsError = useDailyTalkStore(
    (state) => state.conversationOptionsError
  );
  const conversationId = useDailyTalkStore((state) => state.selectedConversationId);
  const lessons = useDailyTalkStore((state) =>
    conversationId ? state.lessonsByConversation[conversationId] : undefined
  );
  const isLoadingLessons = useDailyTalkStore((state) =>
    conversationId ? state.loadingLessonsByConversation[conversationId] : false
  );
  const loadError = useDailyTalkStore((state) =>
    conversationId ? state.lessonErrorsByConversation[conversationId] : null
  );
  const loadMoreConversations = useDailyTalkStore((state) => state.loadMoreConversations);
  const loadLessons = useDailyTalkStore((state) => state.loadLessons);
  const selectConversation = useDailyTalkStore((state) => state.selectConversation);

  useEffect(() => {
    if (
      !initialLoadStartedRef.current &&
      conversationOptions.length === 0 &&
      !isLoadingOptions &&
      hasMoreConversationOptions
    ) {
      initialLoadStartedRef.current = true;
      void loadMoreConversations().catch(() => {});
    }
  }, [
    conversationOptions.length,
    hasMoreConversationOptions,
    isLoadingOptions,
    loadMoreConversations,
  ]);

  useEffect(() => {
    if (!conversationId) return;
    if (lessons || isLoadingLessons) return;
    void loadLessons(conversationId).catch(() => {});
  }, [conversationId, isLoadingLessons, lessons, loadLessons]);

  if (conversationOptionsError && conversationOptions.length === 0) {
    return (
      <section
        role="alert"
        className="w-full max-w-3xl rounded-2xl border border-rose-500/30 bg-[#131d31] p-6 text-rose-200"
      >
        <p>Không thể tải danh sách hội thoại: {conversationOptionsError}</p>
        <button
          type="button"
          onClick={() => void loadMoreConversations().catch(() => {})}
          className="mt-4 rounded-lg border border-rose-400/40 px-4 py-2 text-sm"
        >
          Thử tải lại
        </button>
      </section>
    );
  }

  if (conversationOptions.length === 0 && !isLoadingOptions && !hasMoreConversationOptions) {
    return (
      <section
        role="status"
        className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-[#131d31] p-6 text-slate-300"
      >
        Không tìm thấy hội thoại nào.
      </section>
    );
  }

  if (!conversationId || !lessons) {
    return (
      <section
        role={loadError ? "alert" : "status"}
        className={`w-full max-w-3xl rounded-2xl border bg-[#131d31] p-6 ${
          loadError
            ? "border-rose-500/30 text-rose-200"
            : "border-slate-700 text-slate-300"
        }`}
      >
        {loadError ? (
          <>
            <p>Không thể tải bài học từ PostgreSQL: {loadError}</p>
            <button
              type="button"
              onClick={() => {
                if (conversationId) void loadLessons(conversationId).catch(() => {});
              }}
              className="mt-4 rounded-lg border border-rose-400/40 px-4 py-2 text-sm"
            >
              Thử tải lại
            </button>
          </>
        ) : isLoadingOptions && conversationOptions.length === 0 ? (
          "Đang tải danh sách hội thoại..."
        ) : (
          isLoadingLessons ? "Đang tải bài học từ PostgreSQL..." : "Đang tải hội thoại..."
        )}
      </section>
    );
  }

  return (
    <PracticeSessionPlayer
      key={conversationId}
      lessons={lessons}
      conversationOptions={conversationOptions}
      selectedConversationId={conversationId}
      onConversationChange={selectConversation}
      hasMoreConversationOptions={hasMoreConversationOptions}
      isLoadingOptions={isLoadingOptions}
      conversationOptionsError={conversationOptionsError}
      onLoadMoreConversations={() => void loadMoreConversations().catch(() => {})}
    />
  );
}

function ConversationPicker({
  conversations,
  selectedConversationId,
  onSelect,
  hasMore,
  isLoadingMore,
  error,
  onLoadMore,
}: {
  conversations: ConversationOption[];
  selectedConversationId: string;
  onSelect: (conversationId: string) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  error: string | null;
  onLoadMore: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = conversations.find(
    (option) => option.conversationId === selectedConversationId
  );

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !dropdownRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative z-30 w-full max-w-sm">
      <label className="mb-1.5 block text-xs text-slate-400">Chọn hội thoại</label>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm text-white hover:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
      >
        <span className="truncate">{selected?.label ?? `DailyTalk #${selectedConversationId}`}</span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Danh sách hội thoại"
          onScroll={(event) => {
            const element = event.currentTarget;
            if (
              hasMore &&
              !isLoadingMore &&
              element.scrollHeight - element.scrollTop - element.clientHeight < 48
            ) {
              onLoadMore();
            }
          }}
          className="absolute left-0 right-0 top-full mt-2 max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-slate-700 bg-slate-950 p-1.5 shadow-2xl"
        >
          {conversations.map((option) => (
            <button
              key={option.conversationId}
              type="button"
              role="option"
              aria-selected={option.conversationId === selectedConversationId}
              onClick={() => {
                onSelect(option.conversationId);
                setIsOpen(false);
              }}
              className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                option.conversationId === selectedConversationId
                  ? "bg-indigo-500/20 text-indigo-200"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {option.label}
            </button>
          ))}
          {isLoadingMore && (
            <p role="status" className="px-3 py-3 text-center text-xs text-slate-400">
              Đang tải thêm...
            </p>
          )}
          {error && (
            <div className="px-3 py-3 text-sm text-rose-300">
              <p>{error}</p>
              <button
                type="button"
                onClick={onLoadMore}
                className="mt-2 text-indigo-300 underline underline-offset-2"
              >
                Thử tải lại
              </button>
            </div>
          )}
          {!hasMore && !isLoadingMore && !error && conversations.length > 0 && (
            <p className="px-3 py-3 text-center text-xs text-slate-500">
              Đã tải hết danh sách
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PracticeSessionPlayer({
  lessons,
  conversationOptions,
  selectedConversationId,
  onConversationChange,
  hasMoreConversationOptions,
  isLoadingOptions,
  conversationOptionsError,
  onLoadMoreConversations,
}: {
  lessons: Lesson[];
  conversationOptions: ConversationOption[];
  selectedConversationId: string;
  onConversationChange: (conversationId: string) => void;
  hasMoreConversationOptions: boolean;
  isLoadingOptions: boolean;
  conversationOptionsError: string | null;
  onLoadMoreConversations: () => void;
}) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [hasPlayedCurrent, setHasPlayedCurrent] = useState(false);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mic = useMicrophone();
  const {
    clearAttempt,
    isRecording,
    playOriginalAndRecord,
    stopRecording,
    transcript: liveTranscript,
  } = mic;
  const lesson = lessons[lessonIndex] ?? lessons[0]!;

  const evaluation = useMemo(() => {
    return evaluateSpokenWords(liveTranscript, lesson.words);
  }, [lesson.words, liveTranscript]);

  // Derived state: Xác định khi nào đã hoàn thành lượt nói (đã đọc đủ từ hoặc micro đã tắt sau khi nói)
  const hasFinishedSpeaking =
    evaluation.spokenList.length >= evaluation.totalTarget ||
    (!mic.isRecording &&
      (evaluation.spokenList.length > 0 || mic.hasDetectedSpeech));

  // Next turn in conversation; plays new original audio then turns on mic
  const handleNext = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    clearAttempt();
    setHasPlayedCurrent(true);
    const nextIndex = (lessonIndex + 1) % lessons.length;
    setLessonIndex(nextIndex);
    const nextLesson = lessons[nextIndex] ?? lessons[0]!;
    playOriginalAndRecord(nextLesson.sentence, {
      audioFile: nextLesson.audioFile,
      timeRange: nextLesson.timeRange,
      role: nextLesson.role,
    });
  }, [clearAttempt, lessonIndex, lessons, playOriginalAndRecord]);

  // Previous turn in conversation
  const handlePrev = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    clearAttempt();
    setHasPlayedCurrent(true);
    const prevIndex = (lessonIndex - 1 + lessons.length) % lessons.length;
    setLessonIndex(prevIndex);
    const prevLesson = lessons[prevIndex] ?? lessons[0]!;
    playOriginalAndRecord(prevLesson.sentence, {
      audioFile: prevLesson.audioFile,
      timeRange: prevLesson.timeRange,
      role: prevLesson.role,
    });
  }, [clearAttempt, lessonIndex, lessons, playOriginalAndRecord]);

  // Replay original audio of current turn
  const handleReplay = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    clearAttempt();
    setHasPlayedCurrent(true);
    playOriginalAndRecord(lesson.sentence, {
      audioFile: lesson.audioFile,
      timeRange: lesson.timeRange,
      role: lesson.role,
    });
  }, [clearAttempt, lesson, playOriginalAndRecord]);

  // Stop recording and replay sample to retry
  const handleStopAndReplay = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    stopRecording();
    clearAttempt();
    setHasPlayedCurrent(true);
    playOriginalAndRecord(lesson.sentence, {
      audioFile: lesson.audioFile,
      timeRange: lesson.timeRange,
      role: lesson.role,
    });
  }, [clearAttempt, lesson, playOriginalAndRecord, stopRecording]);

  useEffect(() => {
    if (isRecording || !evaluation.isAllCorrect) return;
    if (advanceTimerRef.current) return;

    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      handleNext();
    }, 1300);
  }, [evaluation.isAllCorrect, handleNext, isRecording]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  // Pronounce an individual word on click
  const handleWordClick = (word: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className="w-full min-w-0 max-w-3xl lg:max-w-4xl bg-[#131d31] rounded-2xl sm:rounded-3xl border border-slate-800/80 shadow-2xl p-4 sm:p-9 lg:p-10 flex flex-col gap-5 sm:gap-6 lg:gap-7 relative overflow-visible backdrop-blur-sm">
      <ConversationPicker
        conversations={conversationOptions}
        selectedConversationId={selectedConversationId}
        onSelect={onConversationChange}
        hasMore={hasMoreConversationOptions}
        isLoadingMore={isLoadingOptions}
        error={conversationOptionsError}
        onLoadMore={onLoadMoreConversations}
      />

      <SessionHeader
        conversationId={lesson.conversationId}
        speakerLabel={lesson.speakerLabel}
        role={lesson.role}
        turnIndex={lesson.turnIndex}
        totalTurns={lessons.length}
        isPlayingOriginal={mic.isPlayingOriginal}
        hasPlayedCurrent={hasPlayedCurrent}
        onReplay={handleReplay}
        onNext={handleNext}
        onPrev={handlePrev}
      />

      <WaveformCard
        isRecording={mic.isRecording}
        isPlayingOriginal={mic.isPlayingOriginal}
        isAllCorrect={evaluation.isAllCorrect}
        hasFinishedSpeaking={hasFinishedSpeaking}
        hasErrors={evaluation.hasErrors}
        hasRealMic={mic.hasRealMic}
        hasDetectedSpeech={mic.hasDetectedSpeech}
        toggleRecording={mic.toggleRecording}
        analyserRef={mic.analyserRef}
        timeDataArrayRef={mic.timeDataArrayRef}
      />

      <AnalysisCard
        spokenWords={evaluation.spokenList}
        totalTarget={evaluation.totalTarget}
        isRecording={mic.isRecording}
        hasDetectedSpeech={mic.hasDetectedSpeech}
        isPlayingOriginal={mic.isPlayingOriginal}
        isAllCorrect={evaluation.isAllCorrect}
        hasErrors={evaluation.hasErrors}
        hasFinishedSpeaking={hasFinishedSpeaking}
        onStopRecording={mic.stopRecording}
        onStartRecording={mic.startRecording}
        onStopAndReplay={handleStopAndReplay}
        onWordClick={handleWordClick}
      />

      <HintCard lesson={lesson} />
    </main>
  );
}
