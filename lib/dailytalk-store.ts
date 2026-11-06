"use client";

import { create } from "zustand";
import type { Lesson } from "@/components/pronunciation/lessons";

export type ConversationOption = {
  conversationId: string;
  label: string;
};

type ConversationPayload = ConversationOption & {
  lessons: Lesson[];
};

type DailyTalkStore = {
  conversationOptions: ConversationOption[];
  hasMoreConversationOptions: boolean;
  nextOffset: number;
  isLoadingOptions: boolean;
  conversationOptionsError: string | null;
  selectedConversationId: string | null;
  lessonsByConversation: Record<string, Lesson[]>;
  loadingLessonsByConversation: Record<string, boolean>;
  lessonErrorsByConversation: Record<string, string | null>;
  selectConversation: (conversationId: string) => void;
  loadMoreConversations: () => Promise<void>;
  loadLessons: (conversationId: string) => Promise<Lesson[]>;
};

const pendingLessonRequests = new Map<string, Promise<Lesson[]>>();

function getResponseError(result: unknown, fallback: string) {
  return typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
    ? result.error
    : fallback;
}

function isConversationPayload(value: unknown): value is ConversationPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "conversationId" in value &&
    typeof value.conversationId === "string" &&
    /^\d+$/.test(value.conversationId) &&
    "label" in value &&
    typeof value.label === "string" &&
    "lessons" in value &&
    Array.isArray(value.lessons) &&
    value.lessons.length > 0 &&
    value.lessons.every(isLesson)
  );
}

function isLesson(value: unknown): value is Lesson {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "conversationId" in value &&
    typeof value.conversationId === "string" &&
    "role" in value &&
    (value.role === "0" || value.role === "1") &&
    "sentence" in value &&
    typeof value.sentence === "string" &&
    "words" in value &&
    Array.isArray(value.words) &&
    value.words.every((word) => typeof word === "string") &&
    "turnIndex" in value &&
    typeof value.turnIndex === "number" &&
    "timeRange" in value &&
    Array.isArray(value.timeRange) &&
    value.timeRange.length === 2 &&
    value.timeRange.every((time) => typeof time === "number")
  );
}

export const useDailyTalkStore = create<DailyTalkStore>((set, get) => ({
  conversationOptions: [],
  hasMoreConversationOptions: true,
  nextOffset: 0,
  isLoadingOptions: false,
  conversationOptionsError: null,
  selectedConversationId: null,
  lessonsByConversation: {},
  loadingLessonsByConversation: {},
  lessonErrorsByConversation: {},

  selectConversation: (conversationId) => set({ selectedConversationId: conversationId }),

  loadMoreConversations: async () => {
    const state = get();
    if (state.isLoadingOptions || !state.hasMoreConversationOptions) return;

    set({ isLoadingOptions: true, conversationOptionsError: null });
    try {
      const response = await fetch(
        `/api/dailytalk/conversations?list=true&offset=${state.nextOffset}`
      );
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getResponseError(result, "Không thể tải danh sách hội thoại."));
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("conversations" in result) ||
        !Array.isArray(result.conversations) ||
        !result.conversations.every(isConversationPayload) ||
        !("nextOffset" in result) ||
        typeof result.nextOffset !== "number" ||
        !Number.isSafeInteger(result.nextOffset) ||
        !("hasMore" in result) ||
        typeof result.hasMore !== "boolean"
      ) {
        throw new Error("Danh sách hội thoại trả về không hợp lệ.");
      }

      const payloads = result.conversations.filter(isConversationPayload);
      if (payloads.length !== result.conversations.length) {
        throw new Error("Danh sách hội thoại trả về không hợp lệ.");
      }
      const nextOffset = result.nextOffset;
      const hasMore = result.hasMore;
      const existingIds = new Set(get().conversationOptions.map((item) => item.conversationId));
      const newOptions = payloads
        .map(({ conversationId, label }) => ({ conversationId, label }))
        .filter((item) => !existingIds.has(item.conversationId));
      set((current) => {
        const conversationOptions = [...current.conversationOptions, ...newOptions];
        const lessonsByConversation = { ...current.lessonsByConversation };
        for (const payload of payloads) {
          lessonsByConversation[payload.conversationId] = payload.lessons;
        }
        return {
          conversationOptions,
          lessonsByConversation,
          selectedConversationId:
            current.selectedConversationId ?? conversationOptions[0]?.conversationId ?? null,
          hasMoreConversationOptions: hasMore,
          nextOffset,
        };
      });
    } catch (error) {
      set({
        conversationOptionsError:
          error instanceof Error ? error.message : "Không thể tải danh sách hội thoại.",
      });
      throw error;
    } finally {
      set({ isLoadingOptions: false });
    }
  },

  loadLessons: (conversationId) => {
    const cached = get().lessonsByConversation[conversationId];
    if (cached) return Promise.resolve(cached);

    const pending = pendingLessonRequests.get(conversationId);
    if (pending) return pending;

    set((current) => ({
      loadingLessonsByConversation: {
        ...current.loadingLessonsByConversation,
        [conversationId]: true,
      },
      lessonErrorsByConversation: {
        ...current.lessonErrorsByConversation,
        [conversationId]: null,
      },
    }));

    const request = (async () => {
      const response = await fetch(
        `/api/dailytalk/conversations?conversationId=${encodeURIComponent(conversationId)}`
      );
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getResponseError(result, "Không thể tải hội thoại từ PostgreSQL."));
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("lessons" in result) ||
        !Array.isArray(result.lessons)
      ) {
        throw new Error("Database trả về dữ liệu bài học không hợp lệ.");
      }

      const lessons = result.lessons.filter(isLesson);
      if (lessons.length === 0 || lessons.length !== result.lessons.length) {
        throw new Error("Database trả về dữ liệu bài học không hợp lệ.");
      }

      set((current) => ({
        lessonsByConversation: {
          ...current.lessonsByConversation,
          [conversationId]: lessons,
        },
        lessonErrorsByConversation: {
          ...current.lessonErrorsByConversation,
          [conversationId]: null,
        },
      }));
      return lessons;
    })().catch((error: unknown) => {
      set((current) => ({
        lessonErrorsByConversation: {
          ...current.lessonErrorsByConversation,
          [conversationId]:
            error instanceof Error ? error.message : "Không thể tải bài học từ database.",
        },
      }));
      throw error;
    }).finally(() => {
      set((current) => ({
        loadingLessonsByConversation: {
          ...current.loadingLessonsByConversation,
          [conversationId]: false,
        },
      }));
    });

    pendingLessonRequests.set(conversationId, request);
    void request.finally(() => {
      if (pendingLessonRequests.get(conversationId) === request) {
        pendingLessonRequests.delete(conversationId);
      }
    }).catch(() => {});
    return request;
  },
}));
