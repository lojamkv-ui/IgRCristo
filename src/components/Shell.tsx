"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  IconCalendar,
  IconChurch,
  IconDashboard,
  IconSettings,
  IconUsers,
  IconUserPlus,
  IconX,
} from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Painel",
    icon: <IconDashboard size={19} />,
    match: (pathname) => pathname === "/",
  },
  {
    href: "/membros",
    label: "Membros",
    icon: <IconUsers size={19} />,
    match: (pathname) => pathname.startsWith("/membros"),
  },
  {
    href: "/agenda",
    label: "Agenda de cultos",
    icon: <IconCalendar size={19} />,
    match: (pathname) => pathname.startsWith("/agenda"),
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: <IconSettings size={19} />,
    match: (pathname) => pathname.startsWith("/configuracoes"),
  },
];

export function Shell({
  children,
  churchName,
}: {
  children: ReactNode;
  churchName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const currentTitle =
    NAV_ITEMS.find((item) => item.match(pathname))?.label ?? "Gestão eclesiástica";

  const sidebar = (
    <div className="flex h-full flex-col gap-6 bg-brand-950 px-4 py-6 text-brand-100">
      <div className="flex items-center gap-3 px-2">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 text-brand-950 shadow-[0_10px_24px_-12px_rgba(212,162,76,0.9)]">
          <IconChurch size={22} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] font-bold text-white">
            Renascendo em Cristo
          </span>
          <span className="block truncate text-[11px] font-medium uppercase tracking-[0.14em] text-brand-300">
            Gestão da igreja
          </span>
        </span>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-brand-200 hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className={active ? "text-gold-300" : "text-brand-300 group-hover:text-gold-300"}>
                {item.icon}
              </span>
              {item.label}
              {active ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <Link
          href="/membros/novo"
          className="btn btn-gold w-full"
          onClick={() => setOpen(false)}
        >
          <IconUserPlus size={17} />
          Novo membro
        </Link>
        <Link href="/agenda/novo" className="btn w-full border border-white/15 bg-white/5 text-white hover:bg-white/12">
          <IconCalendar size={17} />
          Agendar culto
        </Link>
        <p className="px-2 text-[11px] leading-relaxed text-brand-300/80">
          {churchName}
          <br />
          Sede · Trindade - GO
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-surface">
      {/* Sidebar — desktop */}
      <aside className="app-aside fixed inset-y-0 left-0 z-40 hidden w-[268px] lg:block print:hidden">
        {sidebar}
      </aside>

      {/* Drawer — mobile / tablet */}
      {open ? (
        <div className="fixed inset-0 z-[90] lg:hidden print:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-ink-950/55 backdrop-blur-sm animate-fade-in"
          />
          <div className="animate-slide-in-right absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-pop">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="icon-btn absolute right-2 top-3 z-10 text-brand-200 hover:bg-white/10 hover:text-white"
              aria-label="Fechar menu"
            >
              <IconX size={18} />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[268px]">
        {/* Topbar */}
        <header className="app-header sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md print:hidden">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="icon-btn border border-line bg-white lg:hidden"
              aria-label="Abrir menu"
            >
              <IconChurch size={19} />
            </button>
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-bold text-ink-900 sm:text-base">
                {currentTitle}
              </p>
              <p className="hidden truncate text-xs text-ink-500 sm:block">
                {churchName}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/membros" className="btn btn-outline btn-sm hidden sm:inline-flex">
                <IconUsers size={16} />
                Membros
              </Link>
              <Link href="/agenda" className="btn btn-primary btn-sm">
                <IconCalendar size={16} />
                Agenda
              </Link>
            </div>
          </div>
        </header>

        <main className="app-main mx-auto w-full max-w-[1500px] px-4 pb-20 pt-5 sm:px-6 sm:pt-7">
          {children}
        </main>

        <footer className="mx-auto w-full max-w-[1500px] px-4 pb-10 text-xs text-ink-400 sm:px-6 print:hidden">
          Sistema de gestão de membros e agenda · dados armazenados com segurança no banco da igreja.
        </footer>
      </div>
    </div>
  );
}
