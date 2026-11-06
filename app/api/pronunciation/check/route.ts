const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Thiếu OPENAI_API_KEY trong cấu hình máy chủ." },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Dữ liệu ghi âm không hợp lệ." }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return Response.json(
      { error: "Cần có bản ghi âm để kiểm tra." },
      { status: 400 }
    );
  }
  if (audio.size === 0 || audio.size > MAX_AUDIO_SIZE) {
    return Response.json(
      { error: "Bản ghi âm phải có dung lượng từ 1 byte đến 25 MB." },
      { status: 413 }
    );
  }
  const openAIForm = new FormData();
  openAIForm.set("file", audio, audio.name || "recording.webm");
  openAIForm.set("model", "gpt-4o-mini-transcribe");

  let openAIResponse: Response;
  try {
    openAIResponse = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: openAIForm,
    });
  } catch {
    return Response.json(
      { error: "Không thể kết nối OpenAI để kiểm tra bản ghi." },
      { status: 502 }
    );
  }

  const result: unknown = await openAIResponse.json().catch(() => null);
  if (!openAIResponse.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "object" &&
      result.error !== null &&
      "message" in result.error &&
      typeof result.error.message === "string"
        ? result.error.message
        : "OpenAI không thể nhận dạng bản ghi.";
    return Response.json({ error: message }, { status: 502 });
  }

  if (
    typeof result !== "object" ||
    result === null ||
    !("text" in result) ||
    typeof result.text !== "string"
  ) {
    return Response.json(
      { error: "OpenAI trả về kết quả nhận dạng không hợp lệ." },
      { status: 502 }
    );
  }

  return Response.json({ transcript: result.text.trim() });
}
