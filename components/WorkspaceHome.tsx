"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, Check, Download, FileText, FolderOpen, Image as ImageIcon,
  Link2, Mic, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { TOOLS, isWorkspace, readWorkspace, safeWebLink, writeWorkspace,
  type RoomPlan, type Work, type Workspace } from "../lib/workspace";
import type { AISetting } from "../lib/ai-settings";

type View = "tools" | "rooms" | "works";
const emptyWorkspace: Workspace = { version: 1, rooms: [], works: [] };
const blankRoom = { title: "", audience: "", goal: "", notes: "", toolIds: ["chatbot"] };
const icons = { chatbot: Bot, image: ImageIcon, writing: FileText, voice: Mic };

function fileDownload(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function aiHref(setting: AISetting) {
  const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(setting)))));
  return `/tools/chatbot?ai=${encoded}`;
}

export default function WorkspaceHome({ view }: { view: View }) {
  const [data, setData] = useState<Workspace>(emptyWorkspace);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [roomForm, setRoomForm] = useState<typeof blankRoom | null>(null);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [workForm, setWorkForm] = useState<{ title: string; kind: "text" | "link"; content: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = () => {
      try { setData(readWorkspace()); setStorageError(false); }
      catch { setStorageError(true); setNotice("보관 데이터를 읽지 못했습니다. 기존 데이터를 덮어쓰지 않습니다."); }
      setReady(true);
    };
    const timer = setTimeout(load, 0);
    window.addEventListener("storage", load); window.addEventListener("workspace-change", load);
    return () => { clearTimeout(timer); window.removeEventListener("storage", load); window.removeEventListener("workspace-change", load); };
  }, []);

  function commit(update: (current: Workspace) => Workspace) {
    if (!ready || storageError) return false;
    try {
      const next = update(readWorkspace()); writeWorkspace(next); setData(next); setNotice("저장했습니다."); return true;
    } catch { setNotice("저장하지 못했습니다. 저장 공간 또는 보관 항목 수를 확인해주세요."); return false; }
  }

  function saveRoom(event: React.FormEvent) {
    event.preventDefault(); if (!roomForm?.title.trim()) return;
    const room: RoomPlan = { ...roomForm, title: roomForm.title.trim(),
      id: editingRoom ?? crypto.randomUUID(), updatedAt: new Date().toISOString() };
    if (commit(current => ({ ...current, rooms: editingRoom
      ? current.rooms.map(item => item.id === editingRoom ? room : item) : [room, ...current.rooms] }))) {
      setRoomForm(null); setEditingRoom(null);
    }
  }

  function saveWork(event: React.FormEvent) {
    event.preventDefault(); if (!workForm?.title.trim() || !workForm.content.trim()) return;
    if (workForm.kind === "link" && !safeWebLink(workForm.content)) {
      setNotice("http 또는 https로 시작하는 웹 주소를 입력해주세요."); return;
    }
    const work: Work = { ...workForm, title: workForm.title.trim(), content: workForm.content.trim(),
      id: crypto.randomUUID(), toolId: "manual", updatedAt: new Date().toISOString() };
    if (commit(current => ({ ...current, works: [work, ...current.works] }))) setWorkForm(null);
  }

  async function importBackup(file: File) {
    try {
      if (file.size > 6000000) throw new Error("Too large");
      const backup: unknown = JSON.parse(await file.text());
      if (!isWorkspace(backup)) throw new Error("Invalid backup");
      if (!confirm("현재 수업 구성과 작품 목록을 이 파일의 내용으로 바꿀까요?")) return;
      writeWorkspace(backup); setData(backup); setStorageError(false); setNotice("보관 파일을 불러왔습니다.");
    } catch { setNotice("보관 파일을 읽지 못했습니다. 올바른 스튜디오 보관 파일인지 확인해주세요."); }
  }

  const roomList = data.rooms.filter(item => `${item.title} ${item.audience} ${item.goal}`.includes(query));
  const workList = data.works.filter(item => item.title.includes(query));
  const toolList = TOOLS.filter(tool => (category === "전체" || tool.category === category) && tool.name.includes(query));
  const titles = { tools: "AI 도구 모음", rooms: "수업 구성", works: "작품 보관함" };

  return <div className="hub">
    <main className="hub-main" id="studio-content" tabIndex={-1}>
      <div className="page-heading"><div><div className="workspace-label">나의 스튜디오</div><h1>{titles[view]}</h1></div>
        <span className="local-label" title="수업 구성과 작품은 현재 브라우저에 보관됩니다.">이 브라우저에 보관</span>
        {view === 'rooms' && <button className="primary" disabled={!ready || storageError} onClick={() => { setEditingRoom(null); setRoomForm({ ...blankRoom }); }}><Plus size={17} />새 수업 구성</button>}
        {view === 'works' && <button className="primary" disabled={!ready || storageError} onClick={() => setWorkForm({ title: '', kind: 'text', content: '' })}><Plus size={17} />작품 추가</button>}
      </div>

      {notice && <div className="notice" role="status"><span>{notice}</span><button aria-label="알림 닫기" onClick={() => setNotice('')}><X size={16} /></button></div>}
      <div className="workspace-stats"><span><strong>{TOOLS.filter(tool => tool.state === 'available').length}</strong> 사용 가능한 도구</span><span><strong>{data.rooms.length}</strong> 수업 구성</span><span><strong>{data.works.length}</strong> 보관 작품</span></div>

      {roomForm && <form className="workspace-editor" onSubmit={saveRoom}>
        <div className="editor-heading"><h2>{editingRoom ? '수업 구성 수정' : '새 수업 구성'}</h2><button type="button" aria-label="편집 닫기" onClick={() => setRoomForm(null)}><X size={20} /></button></div>
        <div className="form-columns"><label>수업 이름<input required maxLength={100} value={roomForm.title} onChange={e => setRoomForm({ ...roomForm, title: e.target.value })} /></label>
          <label>사용 대상<input maxLength={100} value={roomForm.audience} onChange={e => setRoomForm({ ...roomForm, audience: e.target.value })} /></label></div>
        <label>활동 목표<textarea maxLength={4000} rows={3} value={roomForm.goal} onChange={e => setRoomForm({ ...roomForm, goal: e.target.value })} /></label>
        <fieldset><legend>사용할 도구</legend><div className="tool-checks">{TOOLS.map(tool => <label key={tool.id}>
          <input type="checkbox" disabled={tool.state !== 'available'} checked={roomForm.toolIds.includes(tool.id)}
            onChange={e => setRoomForm({ ...roomForm, toolIds: e.target.checked ? [...roomForm.toolIds, tool.id] : roomForm.toolIds.filter(id => id !== tool.id) })} />
          {tool.name}{tool.state === 'planned' && <small>예정</small>}</label>)}</div></fieldset>
        <label>수업 메모<textarea maxLength={4000} rows={3} value={roomForm.notes} onChange={e => setRoomForm({ ...roomForm, notes: e.target.value })} /></label>
        <div className="form-actions"><button className="primary" type="submit"><Check size={17} />저장</button><button type="button" onClick={() => setRoomForm(null)}>취소</button></div>
      </form>}

      {workForm && <form className="workspace-editor" onSubmit={saveWork}>
        <div className="editor-heading"><h2>작품 추가</h2><button type="button" aria-label="편집 닫기" onClick={() => setWorkForm(null)}><X size={20} /></button></div>
        <label>작품 이름<input required maxLength={100} value={workForm.title} onChange={e => setWorkForm({ ...workForm, title: e.target.value })} /></label>
        <fieldset><legend>작품 유형</legend><div className="tool-checks">{(['text', 'link'] as const).map(kind => <label key={kind}><input type="radio" name="work-kind" checked={workForm.kind === kind} onChange={() => setWorkForm({ ...workForm, kind, content: '' })} />{kind === 'text' ? '글' : '웹 링크'}</label>)}</div></fieldset>
        <label>{workForm.kind === 'link' ? '웹 주소' : '내용'}<textarea required rows={5} maxLength={workForm.kind === 'link' ? 2000 : 20000} value={workForm.content} onChange={e => setWorkForm({ ...workForm, content: e.target.value })} /></label>
        <div className="form-actions"><button className="primary" type="submit"><Check size={17} />보관</button><button type="button" onClick={() => setWorkForm(null)}>취소</button></div>
      </form>}

      <div className="list-toolbar"><label className="search"><Search size={17} /><input aria-label="검색" placeholder="검색" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <div className="backup-actions">
          <button title="수업 구성·작품 백업" aria-label="수업 구성·작품 백업" disabled={!ready || storageError} onClick={() => {
            try { fileDownload('ai-studio-workspace.json', readWorkspace()); }
            catch { setNotice('백업을 만들지 못했습니다. 보관 데이터를 확인해주세요.'); }
          }}><Download size={18} /></button>
          <button title="보관 파일 가져오기" aria-label="보관 파일 가져오기" onClick={() => importRef.current?.click()}><Upload size={18} /></button>
          <input ref={importRef} type="file" accept=".json,application/json" hidden aria-label="보관 파일 선택"
            onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importBackup(file); }} />
        </div>
        {view === 'tools' && <div className="category-tabs" role="group" aria-label="도구 유형">{['전체', '대화', '이미지', '글', '음성'].map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>}
        {view !== 'tools' && <span className="result-count">{view === 'rooms' ? roomList.length : workList.length}개</span>}
      </div>

      {view === 'tools' && <div className="tool-grid">{toolList.map(tool => { const Icon = icons[tool.id]; return <article className={`tool-item accent-${tool.accent}`} key={tool.id}>
        <div className="tool-meta"><span className="tool-icon"><Icon size={26} strokeWidth={1.7} /></span><span className={`tool-status ${tool.state}`}>{tool.state === 'available' ? '사용 가능' : '추가 예정'}</span></div>
        <h2>{tool.name}</h2><span className="tool-category">{tool.category}</span>
        {tool.href ? <Link className="tool-open" href={tool.href}>열기<ArrowRight size={18} /></Link> : <span className="tool-pending">준비 중</span>}
      </article>; })}{!toolList.length && <div className="empty-state">검색 결과가 없습니다.</div>}</div>}

      {view === 'rooms' && <div className="room-list">{roomList.map(room => <article className="room-item" key={room.id}>
        <div className="room-title"><FolderOpen size={21} /><h2>{room.title}</h2><span className="draft-label">수업안</span></div>
        <div className="room-audience">{room.audience || '대상 미정'}</div><p>{room.goal || '활동 목표 미정'}</p>
        <div className="room-tools">{room.toolIds.map(id => <span key={id}>{TOOLS.find(tool => tool.id === id)?.name}</span>)}</div>
        {room.notes && <details><summary>수업 메모</summary><p>{room.notes}</p></details>}
        <div className="item-actions"><button onClick={() => { setEditingRoom(room.id); setRoomForm({ title: room.title, audience: room.audience, goal: room.goal, notes: room.notes, toolIds: room.toolIds }); }}><Pencil size={16} />수정</button>
          <button title="수업 구성 복사" aria-label={`${room.title} 복사`} onClick={() => commit(current => ({ ...current, rooms: [{ ...room, id: crypto.randomUUID(), title: `${room.title.slice(0, 94)} 복사`, updatedAt: new Date().toISOString() }, ...current.rooms] }))}><Plus size={16} /></button>
          <button title="수업 구성 삭제" aria-label={`${room.title} 삭제`} onClick={() => { if (confirm('이 수업 구성을 삭제할까요?')) commit(current => ({ ...current, rooms: current.rooms.filter(item => item.id !== room.id) })); }}><Trash2 size={16} /></button>
          {room.toolIds.includes('chatbot') && <Link href="/tools/chatbot" className="room-tool-link">챗봇 열기<ArrowRight size={16} /></Link>}</div>
      </article>)}{!roomList.length && <div className="empty-state"><FolderOpen size={30} /><h2>{query ? '검색 결과가 없습니다.' : '저장한 수업 구성이 없습니다.'}</h2>{!query && <button onClick={() => { setEditingRoom(null); setRoomForm({ ...blankRoom }); }}><Plus size={17} />수업 구성 만들기</button>}</div>}</div>}

      {view === 'works' && <div className="work-list">{workList.map(work => <article className="work-item" key={work.id}>
        <span className="work-icon">{work.kind === 'ai-setting' ? <Bot size={21} /> : work.kind === 'link' ? <Link2 size={21} /> : <FileText size={21} />}</span>
        <div className="work-info"><h2>{work.title}</h2><span>{work.kind === 'ai-setting' ? 'AI 설정' : work.kind === 'link' ? '웹 링크' : '글'} · {new Date(work.updatedAt).toLocaleDateString('ko-KR')}</span>
          {work.kind === 'text' && <details><summary>내용 보기</summary><p>{work.content as string}</p></details>}</div>
        <div className="item-actions">{work.kind === 'ai-setting' && <Link className="work-open" href={aiHref(work.content as AISetting)}>열기<ArrowRight size={16} /></Link>}
          {work.kind === 'link' && <a className="work-open" href={work.content as string} target="_blank" rel="noopener noreferrer">열기<ArrowRight size={16} /></a>}
          <button title="작품 내보내기" aria-label={`${work.title} 내보내기`} onClick={() => fileDownload('ai-studio-work.json', work.kind === 'ai-setting' ? { format: 'landomvalue-ai', version: 1, setting: work.content } : work)}><Download size={17} /></button>
          <button title="작품 삭제" aria-label={`${work.title} 삭제`} onClick={() => { if (confirm('이 작품을 보관함에서 삭제할까요?')) commit(current => ({ ...current, works: current.works.filter(item => item.id !== work.id) })); }}><Trash2 size={17} /></button></div>
      </article>)}{!workList.length && <div className="empty-state"><FileText size={30} /><h2>{query ? '검색 결과가 없습니다.' : '보관한 작품이 없습니다.'}</h2>{!query && <Link href="/tools/chatbot">챗봇 만들기<ArrowRight size={17} /></Link>}</div>}</div>}
    </main>
  </div>;
}
