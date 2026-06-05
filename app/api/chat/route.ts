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

    const contents = messages.map((msg: ChatMessage) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return Response.json({
      text: response.text,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Gemini 호출 실패" },
      { status: 500 }
    );
  }
}