"use client";

import { useEffect, useRef, useState } from "react";
import { isAISetting, type AISetting } from "../lib/ai-settings";

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

type SavedAI = {
  id: string;
  botName: string;
  role: string;
  target: string;
  tone: string;
  mustDo: string;
  mustNot: string;
};

const QUESTION_LIMIT = 100;

function encodeAISetting(setting: AISetting) {
  const json = JSON.stringify(setting);
  return encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
}

function decodeAISetting(value: string): AISetting | null {
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(value))));
    const setting: unknown = JSON.parse(json);
    return isAISetting(setting) ? setting : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [botName, setBotName] = useState("");
  const [role, setRole] = useState("");
  const [target, setTarget] = useState("");
  const [tone, setTone] = useState("");
  const [mustDo, setMustDo] = useState("");
  const [mustNot, setMustNot] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [savedAIs, setSavedAIs] = useState<SavedAI[]>([]);
  const [showSavedAIs, setShowSavedAIs] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const activeRequestRef = useRef<AbortController | null>(null);
  const requestVersionRef = useRef(0);
  const [chatError, setChatError] = useState<{ text: string; question: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  function updateSetting(setValue: (value: string) => void, value: string) {
    resetChat();
    setShareLink("");
    setValue(value);
  }

  function currentSetting(): AISetting {
    return { botName, role, target, tone, mustDo, mustNot };
  }

  function applySetting(setting: AISetting, id: string | null = null) {
    resetChat();
    setQuestion("");
    setShareLink("");
    setEditingId(id);
    setBotName(setting.botName);
    setRole(setting.role);
    setTarget(setting.target);
    setTone(setting.tone);
    setMustDo(setting.mustDo);
    setMustNot(setting.mustNot);
  }

  function exportAI() {
    if (!botName.trim() || !role.trim()) {
      alert("AI 이름과 역할을 입력해주세요.");
      return;
    }
    const data = { format: "landomvalue-ai", version: 1, setting: currentSetting() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${botName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 60) || "my-ai"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importAI(file: File) {
    try {
      if (file.size > 50000) throw new Error("File too large");
      const data = JSON.parse(await file.text());
      if (data?.format !== "landomvalue-ai" || data.version !== 1 || !isAISetting(data.setting)) {
        throw new Error("Invalid AI file");
      }
      applySetting(data.setting);
      alert("AI 파일을 불러왔습니다. 이 AI 저장하기를 누르면 이 기기에 보관됩니다.");
    } catch {
      alert("AI 파일을 읽지 못했습니다. 이 스튜디오에서 내보낸 JSON 파일을 선택해주세요.");
    }
  }

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container && followLatestRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, loading, chatError]);

  useEffect(() => () => activeRequestRef.current?.abort(), []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem("landomvalue-ai-list");
        if (saved) {
          const list: unknown = JSON.parse(saved);
          if (Array.isArray(list)) {
            setSavedAIs(list.filter((item): item is SavedAI =>
              isAISetting(item) && "id" in item && typeof item.id === "string" && item.id.length > 0,
            ).slice(0, 5));
          }
        }
      } catch {
        console.warn("Saved AI data could not be read.");
      }

    const params = new URLSearchParams(window.location.search);
    const sharedAI = params.get("ai");

    if (sharedAI) {
      const decoded = decodeAISetting(sharedAI);
      if (decoded) {
        setBotName(decoded.botName);
        setRole(decoded.role);
        setTarget(decoded.target);
        setTone(decoded.tone);
        setMustDo(decoded.mustDo);
        setMustNot(decoded.mustNot);
        setMessages([]);
      } else {
        alert("공유 링크의 AI 설정이 올바르지 않습니다. 새 링크를 받아주세요.");
      }
    }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function saveToLocalStorage(nextList: SavedAI[]) {
    try {
      localStorage.setItem("landomvalue-ai-list", JSON.stringify(nextList));
      setSavedAIs(nextList);
      return true;
    } catch {
      alert("저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인해주세요.");
      return false;
    }
  }

  function saveAI(asCopy = false) {
    if (!botName.trim() || !role.trim()) {
      alert("AI 이름과 역할을 입력해주세요.");
      return;
    }
    const existing = asCopy ? undefined : savedAIs.find((ai) => ai.id === editingId);
    if (!existing && savedAIs.length >= 5) {
      alert("저장한 AI는 최대 5개까지 가능합니다. 필요 없는 AI를 삭제한 뒤 다시 저장해주세요.");
      return;
    }

    const newAI: SavedAI = {
      id: existing?.id ?? crypto.randomUUID(),
      botName: botName || "이름 없는 AI",
      role,
      target,
      tone,
      mustDo,
      mustNot,
    };

    const nextList = existing
      ? savedAIs.map((ai) => ai.id === existing.id ? newAI : ai)
      : [newAI, ...savedAIs];
    if (!saveToLocalStorage(nextList)) return;
    setEditingId(newAI.id);
    setShowSavedAIs(true);
    setShowGallery(true);
  }

  function loadAI(ai: SavedAI) {
    applySetting(ai, ai.id);
  }

  function deleteAI(id: string) {
    const nextList = savedAIs.filter((ai) => ai.id !== id);
    if (saveToLocalStorage(nextList) && editingId === id) setEditingId(null);
  }

  async function createShareLink() {
    const setting: AISetting = {
      botName: botName || "이름 없는 AI",
      role,
      target,
      tone,
      mustDo,
      mustNot,
    };

    const encoded = encodeAISetting(setting);
    const url = `${window.location.origin}${window.location.pathname}?ai=${encoded}`;

    setShareLink(url);

    try {
      await navigator.clipboard.writeText(url);
      alert("공유 링크가 복사되었습니다.");
    } catch {
      alert("공유 링크가 생성되었습니다. 아래 링크를 직접 복사해주세요.");
    }
  }

  async function handleRun(retryQuestion?: string) {
    const currentQuestion = retryQuestion ?? question;
    if (!currentQuestion.trim() || activeRequestRef.current || cooldown > 0) return;

    if (currentQuestion.length > QUESTION_LIMIT) {
      alert(`질문은 ${QUESTION_LIMIT}자 이하로 입력해주세요.`);
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      text: currentQuestion,
    };

    const history = chatError ? messages.slice(0, -1) : messages;
    const nextMessages = [...history, userMessage];
    const messagesForAI = nextMessages.slice(-6);
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const version = ++requestVersionRef.current;
    const timeout = setTimeout(() => controller.abort(), 55000);

    followLatestRef.current = true;
    setMessages(nextMessages);
    if (!retryQuestion) setQuestion("");
    setChatError(null);
    setLoading(true);
    setCooldown(5);

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

    try {
      const res = await fetch("/api/chat", {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemPrompt,
          messages: messagesForAI,
        }),
      });

      const data = await res.json();
      if (version !== requestVersionRef.current) return;
      if (!res.ok || typeof data.text !== "string" || !data.text.trim()) {
        setChatError({ text: typeof data.error === "string" ? data.error : "응답을 가져오지 못했어요.", question: currentQuestion });
        return;
      }

      const aiMessage: ChatMessage = {
        role: "ai",
        text: data.text,
      };

      setMessages([...nextMessages, aiMessage]);
    } catch {
      if (version !== requestVersionRef.current) return;
      setChatError({ text: controller.signal.aborted
        ? "답변을 기다리는 시간이 길어졌어요. 다시 시도해주세요."
        : "연결이 잠시 불안정합니다. 잠깐 기다렸다가 다시 시도해주세요.", question: currentQuestion });
    } finally {
      clearTimeout(timeout);
      if (version === requestVersionRef.current) {
        activeRequestRef.current = null;
        setLoading(false);
      }
    }
  }

  function resetChat() {
    requestVersionRef.current++;
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setLoading(false);
    setChatError(null);
    followLatestRef.current = true;
    setMessages([]);
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 rounded-3xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold">엉뚱한가치 AI Studio</h1>
          <p className="mt-3 text-gray-600">
            나만의 AI를 설계하고 직접 대화해보는 AI 실험 플랫폼입니다.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold">1. 나만의 AI 만들기</h2>

            <div className="mt-6 space-y-5">
              <Input label="AI 이름" value={botName} setValue={(value) => updateSetting(setBotName, value)} placeholder="예: 갯벌박사봇, 급식추천봇, 공룡선생님" />
              <Input label="AI의 역할" value={role} setValue={(value) => updateSetting(setRole, value)} placeholder="예: 너는 초등학생을 도와주는 환경 퀴즈 선생님이야." />
              <Input label="사용 대상" value={target} setValue={(value) => updateSetting(setTarget, value)} placeholder="예: 초등학교 5학년" />
              <Input label="말투" value={tone} setValue={(value) => updateSetting(setTone, value)} placeholder="예: 친절하고 재미있게, 어려운 말은 쉽게 풀어서" />
              <TextArea label="반드시 해야 할 것" value={mustDo} setValue={(value) => updateSetting(setMustDo, value)} placeholder="예: 답변 끝에 퀴즈 1개를 낸다." />
              <TextArea label="하지 말아야 할 것" value={mustNot} setValue={(value) => updateSetting(setMustNot, value)} placeholder="예: 개인정보를 묻지 않는다. 어려운 용어를 남발하지 않는다." />

              <button onClick={() => saveAI()} className="w-full rounded-2xl bg-black px-5 py-4 font-bold text-white">
                {editingId ? "수정한 AI 저장하기" : "이 AI 저장하기"}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => applySetting({ botName: "", role: "", target: "", tone: "", mustDo: "", mustNot: "" })} className="rounded-lg border px-3 py-3 font-bold">
                  새 AI 만들기
                </button>
                <button onClick={() => saveAI(true)} disabled={!editingId} className="rounded-lg border px-3 py-3 font-bold disabled:opacity-40">
                  복사본 저장
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={exportAI} className="rounded-lg border px-3 py-3 font-bold">AI 파일 내보내기</button>
                <button onClick={() => importInputRef.current?.click()} className="rounded-lg border px-3 py-3 font-bold">AI 파일 가져오기</button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  aria-label="AI 파일 선택"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void importAI(file);
                  }}
                />
              </div>

              <button onClick={createShareLink} className="w-full rounded-2xl bg-blue-600 px-5 py-4 font-bold text-white">
                공유 링크 만들기
              </button>

              {shareLink && (
                <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                  <p className="font-bold">공유 링크</p>
                  <p className="mt-2 break-all text-gray-600">{shareLink}</p>
                </div>
              )}

              <button onClick={() => setShowSavedAIs(!showSavedAIs)} className="w-full rounded-2xl border px-5 py-4 font-bold">
                {showSavedAIs ? "저장한 AI 숨기기" : `저장한 AI 보기 (${savedAIs.length}/5)`}
              </button>

              <button onClick={() => setShowGallery(!showGallery)} className="w-full rounded-2xl border px-5 py-4 font-bold">
                {showGallery ? "AI 카드 갤러리 숨기기" : "AI 카드 갤러리 보기"}
              </button>
            </div>

            {showSavedAIs && (
              <div className="mt-8 rounded-2xl bg-gray-50 p-4">
                <h3 className="font-bold">저장한 AI</h3>

                {savedAIs.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">아직 저장한 AI가 없습니다.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {savedAIs.map((ai) => (
                      <div key={ai.id} className="rounded-xl bg-white p-4 shadow-sm">
                        <p className="font-bold">{ai.botName}</p>
                        <p className="mt-1 text-sm text-gray-500">{ai.role || "역할 없음"}</p>

                        <div className="mt-3 flex gap-2">
                          <button onClick={() => loadAI(ai)} className="rounded-lg bg-black px-3 py-2 text-sm font-bold text-white">
                            불러오기
                          </button>

                          <button onClick={() => deleteAI(ai.id)} className="rounded-lg border px-3 py-2 text-sm font-bold">
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showGallery && (
              <div className="mt-8 rounded-2xl bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">AI 카드 갤러리</h3>
                  <span className="text-sm text-gray-500">{savedAIs.length}/5</span>
                </div>

                {savedAIs.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">
                    아직 카드로 보여줄 AI가 없습니다. 먼저 AI를 저장해보세요.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {savedAIs.map((ai) => (
                      <button
                        key={ai.id}
                        onClick={() => loadAI(ai)}
                        className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:scale-[1.02] hover:shadow"
                      >
                        <div className="text-3xl">🤖</div>
                        <p className="mt-3 font-bold">{ai.botName}</p>
                        <p className="mt-2 line-clamp-3 text-sm text-gray-500">
                          {ai.role || "아직 역할 설명이 없습니다."}
                        </p>
                        <p className="mt-3 text-xs font-bold text-gray-400">
                          클릭하면 불러오기
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">2. AI 체험하기</h2>
                <p className="mt-1 text-sm text-gray-500">지침을 바꾸면 AI의 답변도 달라집니다.</p>
                <p className="mt-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700">
                  현재 AI: {botName || "이름 없는 AI"}
                </p>
              </div>

              <button onClick={resetChat} className="rounded-xl border px-4 py-2 text-sm font-bold">
                대화 지우기
              </button>
            </div>

            <div
              ref={chatContainerRef}
              role="log"
              aria-label="AI 대화"
              onScroll={(event) => {
                const container = event.currentTarget;
                followLatestRef.current =
                  container.scrollHeight - container.scrollTop - container.clientHeight < 80;
              }}
              className="mt-6 h-[520px] overflow-y-auto rounded-2xl bg-gray-50 p-4"
            >
              {messages.length === 0 ? (
                <p className="text-gray-500">아직 대화가 없습니다. 아래 질문을 입력해보세요.</p>
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
              {chatError && (
                <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
                  <p>{chatError.text}</p>
                  <button
                    onClick={() => handleRun(chatError.question)}
                    disabled={loading || cooldown > 0}
                    className="mt-3 rounded-lg border border-red-300 px-3 py-2 text-sm font-bold disabled:opacity-50"
                  >
                    다시 시도
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <input
                value={question}
                maxLength={QUESTION_LIMIT}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && e.nativeEvent.keyCode !== 229) {
                    e.preventDefault();
                    handleRun();
                  }
                }}
                placeholder="질문을 입력하세요. 예: 티라노사우루스는 왜 유명해?"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3"
              />

              <button
                onClick={() => handleRun()}
                disabled={loading || cooldown > 0}
                className="rounded-xl bg-black px-5 py-3 font-bold text-white disabled:bg-gray-400"
              >
                {loading ? "생각 중..." : cooldown > 0 ? `${cooldown}초` : "보내기"}
              </button>
            </div>

            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>질문은 {QUESTION_LIMIT}자 이하로 입력합니다.</span>
              <span>
                {question.length} / {QUESTION_LIMIT}
              </span>
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
        maxLength={1000}
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
        maxLength={1000}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-gray-300 px-4 py-3"
      />
    </label>
  );
}