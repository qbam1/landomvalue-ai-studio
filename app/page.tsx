"use client";

import { useState } from "react";

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

export default function Home() {
  const [botName, setBotName] = useState("");
  const [role, setRole] = useState("");
  const [target, setTarget] = useState("");
  const [tone, setTone] = useState("");
  const [mustDo, setMustDo] = useState("");
  const [mustNot, setMustNot] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleRun() {
    if (!question.trim() || loading) return;

    const currentQuestion = question;

    const userMessage: ChatMessage = {
      role: "user",
      text: currentQuestion,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setQuestion("");
    setLoading(true);

    const systemPrompt = `
너는 학생이 직접 설계한 AI 역할을 수행한다.

[공통 안전 규칙]
- 사용자가 입력한 핵심 단어를 임의로 바꾸지 않는다.
- 학생이 정한 AI 이름, 역할, 대상, 말투, 규칙을 우선해서 따른다.
- 질문에 없는 설정을 마음대로 추가하지 않는다.
- 이상한 신조어나 의미 없는 단어를 만들지 않는다.
- 모르는 내용은 지어내지 말고 "정확히 모르겠어요"라고 말한다.
- 개인정보를 묻거나 저장하려 하지 않는다.
- 답변은 대상 수준에 맞게 쉽고 명확하게 작성한다.
- 답변은 기본적으로 5문장 이내로 작성한다.
- 설명이 길어질 때는 핵심만 3가지로 정리한다.
- 답변 끝에 퀴즈를 낼 경우, 퀴즈는 1개만 낸다.
- 이전 대화 내용을 참고하여 이어지는 질문에 답한다.

[AI 이름]
${botName || "이름 없는 AI"}

[역할]
${role || "학생을 도와주는 AI"}

[대상]
${target || "초등학생"}

[말투]
${tone || "친절하고 쉽게"}

[반드시 해야 할 것]
${mustDo || "질문에 맞게 정확히 답한다."}

[하지 말아야 할 것]
${mustNot || "개인정보를 묻지 않는다."}
`;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemPrompt,
        messages: nextMessages,
      }),
    });

    const data = await res.json();

    const aiMessage: ChatMessage = {
      role: "ai",
      text: data.text || data.error || "응답을 가져오지 못했어요.",
    };

    setMessages([...nextMessages, aiMessage]);
    setLoading(false);
  }

  function resetChat() {
    setMessages([]);
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-3xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold">엉뚱한가치 GPT Maker</h1>
          <p className="mt-3 text-gray-600">
            로그인 없이 AI 지침을 설계하고, 내가 만든 AI와 직접 대화해보는 수업용 웹앱입니다.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold">1. AI 지침 설계하기</h2>

            <div className="mt-6 space-y-5">
              <Input label="AI 이름" value={botName} setValue={setBotName} placeholder="예: 갯벌박사봇, 급식추천봇, 공룡선생님" />
              <Input label="AI의 역할" value={role} setValue={setRole} placeholder="예: 너는 초등학생을 도와주는 환경 퀴즈 선생님이야." />
              <Input label="사용 대상" value={target} setValue={setTarget} placeholder="예: 초등학교 5학년" />
              <Input label="말투" value={tone} setValue={setTone} placeholder="예: 친절하고 재미있게, 어려운 말은 쉽게 풀어서" />
              <TextArea label="반드시 해야 할 것" value={mustDo} setValue={setMustDo} placeholder="예: 답변 끝에 퀴즈 1개를 낸다." />
              <TextArea label="하지 말아야 할 것" value={mustNot} setValue={setMustNot} placeholder="예: 개인정보를 묻지 않는다. 어려운 용어를 남발하지 않는다." />
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">2. 내 AI와 대화하기</h2>
                <p className="mt-1 text-sm text-gray-500">
                  지침을 바꾸면 AI의 답변도 달라집니다.
                </p>
              </div>

              <button
                onClick={resetChat}
                className="rounded-xl border px-4 py-2 text-sm font-bold"
              >
                대화 지우기
              </button>
            </div>

            <div className="mt-6 h-[520px] overflow-y-auto rounded-2xl bg-gray-50 p-4">
              {messages.length === 0 ? (
                <p className="text-gray-500">
                  아직 대화가 없습니다. 아래 질문을 입력해보세요.
                </p>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={
                        msg.role === "user"
                          ? "ml-auto max-w-[85%] rounded-2xl bg-black p-4 text-white"
                          : "mr-auto max-w-[85%] rounded-2xl bg-white p-4 shadow-sm"
                      }
                    >
                      <p className="whitespace-pre-wrap leading-7">{msg.text}</p>
                    </div>
                  ))}

                  {loading && (
                    <div className="mr-auto max-w-[85%] rounded-2xl bg-white p-4 shadow-sm">
                      AI가 생각 중...
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRun();
                }}
                placeholder="질문을 입력하세요. 예: 티라노사우루스는 왜 유명해?"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3"
              />

              <button
                onClick={handleRun}
                disabled={loading}
                className="rounded-xl bg-black px-5 py-3 font-bold text-white disabled:bg-gray-400"
              >
                보내기
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              주의: 이름, 전화번호, 주소, 학교 계정 비밀번호 같은 개인정보는 입력하지 않습니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-bold">{label}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 px-4 py-3"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-bold">{label}</span>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-gray-300 px-4 py-3"
      />
    </label>
  );
}