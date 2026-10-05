import { GoogleGenAI } from "@google/genai";

import { withRetry, errorStatus } from "../../../lib/gemini-retry";

export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

export async function POST(req: Request) {
  try {
    const { systemPrompt, messages } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    if (typeof systemPrompt !== "string" || systemPrompt.length > 8000 ||
      !Array.isArray(messages) || messages.length === 0 || messages.length > 6 ||
      !messages.every((msg: ChatMessage) => msg &&
        (msg.role === "user" || msg.role === "ai") && typeof msg.text === "string" &&
        msg.text.trim().length > 0 && msg.text.length <= (msg.role === "user" ? 100 : 8000)) ||
      messages.at(-1).role !== "user") {
      return Response.json(
        { error: "messages 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const contents = messages.map((msg: ChatMessage) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents,
      config: {
        maxOutputTokens: 1024,
        httpOptions: { timeout: 12000, retryOptions: { attempts: 1 } },
        systemInstruction:
          systemPrompt || "초등학생이 이해하기 쉽게 한국어로 답변하세요.",
      },
    }), (status, attempt) => console.warn("Gemini retry", { status, attempt }));

    return Response.json({
      text: response.text || "응답이 비어 있습니다.",
    });
  } catch (error: unknown) {
    const status = errorStatus(error);
    console.error("Gemini request failed", { status });
    const message = error instanceof Error ? error.message : "";

    if (status === 429 || message.includes("429")) {
      return Response.json(
        {
          error:
            "Gemini 사용량이 잠시 많습니다. 1분 정도 기다렸다가 다시 시도해주세요.",
        },
        { status: 429 }
      );
    }

    if (message.includes("API key") || message.includes("API_KEY")) {
      return Response.json(
        {
          error:
            "Gemini API 키에 문제가 있습니다. .env.local 또는 Vercel 환경변수를 확인해주세요.",
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        error: "AI 연결이 잠시 불안정해요. 잠시 후 다시 보내주세요.",
      },
      { status: 500 }
    );
  }
}
