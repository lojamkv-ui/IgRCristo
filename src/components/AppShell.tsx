"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { GuardedLink, Providers } from "./providers";

const LINKS = [
  { href: "/", label: "Início", icon: "home" },
  { href: "/membros", label: "Membros", icon: "people" },
  { href: "/agenda", label: "Agenda", icon: "calendar" },
  { href: "/igreja", label: "Igreja", icon: "church" },
];

function Icon({ name }: { name: string }) {
  const props = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "home") return <svg {...props}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></svg>;
  if (name === "people") return <svg {...props}><path d="M16 20v-1.2A3.8 3.8 0 0 0 12.2 15H7.8A3.8 3.8 0 0 0 4 18.8V20" /><circle cx="10" cy="8" r="3" /><path d="M20 20v-1.2A3.2 3.2 0 0 0 17.5 16" /><path d="M16 5.2a3 3 0 0 1 0 5.6" /></svg>;
  if (name === "calendar") return <svg {...props}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3.5V7M16 3.5V7M4 10h16" /></svg>;
  return <svg {...props}><path d="M12 3.5 19 8v12H5V8z" /><path d="M12 8v8M9.2 10.2h5.6" /></svg>;
}

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <Shell>{children}</Shell>
    </Providers>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [actor, setActor] = useState("Secretaria");

  useEffect(() => {
    const stored = localStorage.getItem("renascendo.actor");
    if (stored) setActor(stored);
  }, []);

  const saveActor = (value: string) => {
    setActor(value);
    localStorage.setItem("renascendo.actor", value.trim());
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <aside className="sidebar">
        <div className="brand">
          <img src="/brand/emblem.png" alt="" width="58" height="58" />
          <div>
            <strong>Renascendo</strong>
            <span>Gestão da sede</span>
          </div>
        </div>
        <nav className="nav" aria-label="Principal">
          {LINKS.map((link) => (
            <GuardedLink key={link.href} href={link.href} className={active(pathname, link.href) ? "nav-link active" : "nav-link"}>
              <Icon name={link.icon} />
              {link.label}
            </GuardedLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <label className="actor-field">
            <span>Registrando como</span>
            <input value={actor} maxLength={80} onChange={(event) => saveActor(event.target.value)} placeholder="Secretaria" />
          </label>
          <p>Esse nome entra no histórico de cada alteração.</p>
          <p className="foot-contact">Trindade/GO · (62) 99154-2563</p>
        </div>
      </aside>
      <div className="main-col">
        <header className="mobile-top">
          <img src="/brand/emblem.png" alt="" width="42" height="42" />
          <div>
            <strong>Renascendo</strong>
            <span>Igreja · Trindade/GO</span>
          </div>
        </header>
        <main id="conteudo" className="main">{children}</main>
      </div>
      <nav className="bottom-nav" aria-label="Principal mobile">
        {LINKS.map((link) => (
          <GuardedLink key={link.href} href={link.href} className={active(pathname, link.href) ? "active" : ""}>
            <Icon name={link.icon} />
            <span>{link.label}</span>
          </GuardedLink>
        ))}
      </nav>
    </div>
  );
}
