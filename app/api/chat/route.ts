import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

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

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: "messages 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const contents = messages.map((msg: ChatMessage) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents,
      config: {
        systemInstruction:
          systemPrompt || "초등학생이 이해하기 쉽게 한국어로 답변하세요.",
      },
    });

    return Response.json({
      text: response.text || "응답이 비어 있습니다.",
    });
  } catch (error: any) {
    console.error("Gemini Error:", error);

    const status = error?.status || error?.code;
    const message = error?.message || String(error);

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
        error: `Gemini 오류: ${message}`,
      },
      { status: 500 }
    );
  }
}