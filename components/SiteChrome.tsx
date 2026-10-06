"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Boxes, FileText, FolderOpen } from "lucide-react";

const menus = [
  { href: "/", label: "도구 모음", icon: Boxes },
  { href: "/tools/chatbot", label: "챗봇 만들기", icon: Bot },
  { href: "/rooms", label: "수업 구성", icon: FolderOpen },
  { href: "/works", label: "작품 보관함", icon: FileText },
];

export function SiteHeader() {
  const pathname = usePathname();
  return <>
    <a className="skip-content" href="#studio-content">본문으로 이동</a>
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand"><Boxes size={29} strokeWidth={1.6} aria-hidden="true" /><span>엉뚱한가치<strong>AI Studio</strong></span></Link>
        <span className="site-preview">개발 미리보기</span>
        <nav className="site-nav" aria-label="주요 메뉴">
          {menus.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
            <Icon size={18} aria-hidden="true" /><span>{label}</span>
          </Link>)}
        </nav>
      </div>
    </header>
  </>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="site-footer-inner">
      <div className="site-footer-brand"><Link href="/">엉뚱한가치 AI Studio</Link><p>개발 버전 · 온라인 수업 연결 전</p></div>
      <nav aria-label="하단 메뉴">{menus.map(({ href, label }) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <div className="site-footer-bottom"><span>© 엉뚱한가치 AI Studio</span><span>보관 위치: 현재 브라우저</span></div>
    </div>
  </footer>;
}
