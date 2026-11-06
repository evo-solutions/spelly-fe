import { getPostgresPool } from "@/lib/db";
import type { Lesson } from "@/components/pronunciation/lessons";

type ConversationRow = {
  conversation_id: string;
  speaker_ids: unknown;
  turn_ids: unknown;
  texts: unknown;
  audio_cut_idxs: unknown;
  sample_rate: number;
  audio_key: string;
};

function getAudioBaseUrl() {
  const configuredUrl = process.env.DAILYTALK_AUDIO_BASE_URL?.trim();
  if (!configuredUrl) return null;

  let baseUrl: URL;
  try {
    baseUrl = new URL(configuredUrl);
  } catch {
    throw new Error("DAILYTALK_AUDIO_BASE_URL must be a valid public URL.");
  }

  if (
    !["http:", "https:"].includes(baseUrl.protocol) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error("DAILYTALK_AUDIO_BASE_URL must be a public HTTP(S) URL without credentials.");
  }

  baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, "")}/`;
  return baseUrl;
}

function getAudioUrl(baseUrl: URL | null, audioKey: string) {
  if (!baseUrl) return undefined;

  const segments = audioKey.replace(/^\/+/, "").split("/");
  if (
    segments.length === 0 ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Conversation row has an invalid audio key.");
  }

  return new URL(segments.map(encodeURIComponent).join("/"), baseUrl).toString();
}

function getLessons(row: ConversationRow, audioBaseUrl: URL | null): Lesson[] {
  const { speaker_ids, turn_ids, texts, audio_cut_idxs, sample_rate } = row;
  if (
    !Array.isArray(speaker_ids) ||
    !Array.isArray(turn_ids) ||
    !Array.isArray(texts) ||
    !Array.isArray(audio_cut_idxs) ||
    !Number.isInteger(sample_rate) ||
    sample_rate <= 0 ||
    speaker_ids.length !== texts.length ||
    turn_ids.length !== texts.length ||
    audio_cut_idxs.length !== texts.length
  ) {
    throw new Error("Conversation row has an invalid shape.");
  }

  return texts.map((value, index) => {
    const sentence = value;
    const role = String(speaker_ids[index]);
    const turnId = Number(turn_ids[index]);
    const cut = audio_cut_idxs[index];

    if (
      typeof sentence !== "string" ||
      !sentence.trim() ||
      (role !== "0" && role !== "1") ||
      !Number.isInteger(turnId) ||
      !Array.isArray(cut) ||
      cut.length !== 2 ||
      typeof cut[0] !== "number" ||
      !Number.isFinite(cut[0]) ||
      typeof cut[1] !== "number" ||
      !Number.isFinite(cut[1])
    ) {
      throw new Error(`Conversation turn ${index} has invalid data.`);
    }

    const startSample = cut[0];
    const endSample = cut[1];
    if (startSample < 0 || endSample <= startSample) {
      throw new Error(`Conversation turn ${index} has invalid audio boundaries.`);
    }
    const sampleRange: [number, number] = [startSample, endSample];
    const timeRange: [number, number] = [
      startSample / sample_rate,
      endSample / sample_rate,
    ];
    const audioFile = getAudioUrl(audioBaseUrl, row.audio_key);

    return {
      id: `turn-${turnId}`,
      label: `DailyTalk #${row.conversation_id} · Câu ${String(index + 1).padStart(2, "0")}`,
      title: sentence,
      turnIndex: index,
      role,
      speakerLabel: role === "1" ? "Speaker A" : "Speaker B",
      conversationId: row.conversation_id,
      words: sentence.trim().split(/\s+/),
      sentence,
      ipa: "",
      meaning: "",
      vietnamese: "",
      sampleRange,
      timeRange,
      ...(audioFile ? { audioFile } : {}),
    };
  });
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { error: "Chưa cấu hình DATABASE_URL cho PostgreSQL." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  if (url.searchParams.get("list") === "true") {
    const rawOffset = url.searchParams.get("offset") ?? "0";
    if (!/^\d+$/.test(rawOffset) || !Number.isSafeInteger(Number(rawOffset))) {
      return Response.json({ error: "offset phải là số nguyên không âm." }, { status: 400 });
    }

    const offset = Number(rawOffset);
    let audioBaseUrl: URL | null;
    try {
      audioBaseUrl = getAudioBaseUrl();
    } catch (error) {
      console.error(
        "Invalid DailyTalk audio URL configuration:",
        error instanceof Error ? error.message : "Unknown configuration error"
      );
      return Response.json(
        { error: "DAILYTALK_AUDIO_BASE_URL phải là URL public hợp lệ." },
        { status: 500 }
      );
    }

    try {
      const result = await getPostgresPool().query<ConversationRow>(
        `SELECT conversation_id, speaker_ids, turn_ids, texts, audio_cut_idxs, sample_rate, audio_key
         FROM public.dailytalk_conversations
         ORDER BY conversation_id::bigint ASC
         LIMIT $1
         OFFSET $2`,
        [11, offset]
      );
      const conversations = result.rows.slice(0, 10).map((row) => ({
        conversationId: row.conversation_id,
        label: `DailyTalk #${row.conversation_id}`,
        lessons: getLessons(row, audioBaseUrl),
      }));

      return Response.json({
        conversations,
        nextOffset: offset + conversations.length,
        hasMore: result.rows.length > conversations.length,
      });
    } catch (error) {
      console.error(
        "Failed to list dailytalk_conversations:",
        error instanceof Error ? error.message : "Unknown database error"
      );
      return Response.json(
        { error: "Không thể tải danh sách hội thoại từ PostgreSQL." },
        { status: 502 }
      );
    }
  }

  const requestedConversationId = url.searchParams.get("conversationId") ?? "0";
  if (!/^\d+$/.test(requestedConversationId)) {
    return Response.json(
      { error: "conversationId phải là số nguyên không âm." },
      { status: 400 }
    );
  }

  let audioBaseUrl: URL | null;
  try {
    audioBaseUrl = getAudioBaseUrl();
  } catch (error) {
    console.error(
      "Invalid DailyTalk audio URL configuration:",
      error instanceof Error ? error.message : "Unknown configuration error"
    );
    return Response.json(
      { error: "DAILYTALK_AUDIO_BASE_URL phải là URL public hợp lệ." },
      { status: 500 }
    );
  }

  try {
    const result = await getPostgresPool().query<ConversationRow>(
      `SELECT conversation_id, speaker_ids, turn_ids, texts, audio_cut_idxs, sample_rate, audio_key
       FROM public.dailytalk_conversations
       WHERE conversation_id = $1
       LIMIT 1`,
      [requestedConversationId]
    );
    const row = result.rows[0];
    if (!row) {
      return Response.json(
        { error: `Không tìm thấy hội thoại ${requestedConversationId}.` },
        { status: 404 }
      );
    }

    const lessons = getLessons(row, audioBaseUrl);

    return Response.json({
      conversationId: row.conversation_id,
      lessons,
    });
  } catch (error) {
    console.error(
      "Failed to query dailytalk_conversations:",
      error instanceof Error ? error.message : "Unknown database error"
    );
    return Response.json(
      { error: "Không thể đọc bảng dailytalk_conversations. Kiểm tra kết nối và schema database." },
      { status: 502 }
    );
  }
}
