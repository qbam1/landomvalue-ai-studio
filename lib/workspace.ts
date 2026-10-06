import { isAISetting, type AISetting } from "./ai-settings";

export const TOOLS = [
  { id: "chatbot", name: "챗봇 만들기", category: "대화", state: "available", href: "/tools/chatbot", accent: "green" },
  { id: "image", name: "이미지 만들기", category: "이미지", state: "planned", href: null, accent: "pink" },
  { id: "writing", name: "글쓰기 실험", category: "글", state: "planned", href: null, accent: "blue" },
  { id: "voice", name: "음성 실험", category: "음성", state: "planned", href: null, accent: "gold" },
] as const;

export type RoomPlan = {
  id: string;
  title: string;
  audience: string;
  goal: string;
  notes: string;
  toolIds: string[];
  updatedAt: string;
};

export type Work = {
  id: string;
  title: string;
  toolId: string;
  kind: "ai-setting" | "text" | "link";
  content: AISetting | string;
  updatedAt: string;
};

export type Workspace = { version: 1; rooms: RoomPlan[]; works: Work[] };
export const WORKSPACE_KEY = "landomvalue-workspace-v1";

function validDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
function bounded(value: unknown, limit = 4000): value is string {
  return typeof value === "string" && value.length <= limit;
}
export function safeWebLink(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}
export function isWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<Workspace>;
  return data.version === 1 && Array.isArray(data.rooms) && data.rooms.length <= 100 &&
    Array.isArray(data.works) && data.works.length <= 200 &&
    data.rooms.every((room) => room && bounded(room.id, 100) && bounded(room.title, 100) &&
      bounded(room.audience, 100) && bounded(room.goal) && bounded(room.notes) &&
      validDate(room.updatedAt) && Array.isArray(room.toolIds) && room.toolIds.length <= 20 &&
      room.toolIds.every((id: unknown) => TOOLS.some(tool => tool.id === id))) &&
    data.works.every((work) => work && bounded(work.id, 100) && bounded(work.title, 100) &&
      bounded(work.toolId, 100) && validDate(work.updatedAt) &&
      ((work.kind === "ai-setting" && isAISetting(work.content)) ||
        (work.kind === "text" && bounded(work.content, 20000)) ||
        (work.kind === "link" && bounded(work.content, 2000) && safeWebLink(work.content)))) &&
    new Set(data.rooms.map(room => room.id)).size === data.rooms.length &&
    new Set(data.works.map(work => work.id)).size === data.works.length;
}

export function readWorkspace(): Workspace {
  const raw = localStorage.getItem(WORKSPACE_KEY);
  if (!raw) return { version: 1, rooms: [], works: [] };
  const data: unknown = JSON.parse(raw);
  if (!isWorkspace(data)) throw new Error("Workspace data is invalid");
  return data;
}
export function writeWorkspace(data: Workspace) {
  if (!isWorkspace(data)) throw new Error("Workspace limits exceeded");
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("workspace-change"));
}
export function storeAIWork(setting: AISetting) {
  const data = readWorkspace();
  const work: Work = { id: crypto.randomUUID(), title: setting.botName.slice(0, 100) || "이름 없는 AI",
    toolId: "chatbot", kind: "ai-setting", content: setting, updatedAt: new Date().toISOString() };
  writeWorkspace({ ...data, works: [work, ...data.works] });
}
