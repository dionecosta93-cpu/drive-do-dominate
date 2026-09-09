import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Search, History, Archive, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarLayout,
  head: () => ({
    meta: [
      { title: "Agenda — Disciplina Absoluta" },
      { name: "description", content: "Sua agenda inteligente de missões." },
    ],
  }),
});

function CalendarLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/calendar", label: "Mês", exact: true },
    { to: "/calendar/week", label: "Semana", exact: false },
    { to: "/calendar/history", label: "Histórico", exact: false },
    { to: "/calendar/archived", label: "Arquivo", exact: false },
  ] as const;
  return (
    <div className="px-4 pt-6 pb-8 animate-rise">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="size-5 text-discipline shrink-0" />
          <h1 className="text-xl font-heading font-extrabold uppercase truncate">Agenda</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/calendar/search"
            aria-label="Buscar"
            className="size-9 grid place-items-center rounded-full border border-border bg-surface"
          >
            <Search className="size-4" />
          </Link>
          <Link
            to="/calendar/history"
            aria-label="Histórico"
            className="size-9 grid place-items-center rounded-full border border-border bg-surface"
          >
            <History className="size-4" />
          </Link>
          <Link
            to="/calendar/archived"
            aria-label="Arquivadas"
            className="size-9 grid place-items-center rounded-full border border-border bg-surface"
          >
            <Archive className="size-4" />
          </Link>
        </div>
      </header>
      <div className="flex gap-1 mb-5 bg-surface border border-border rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex-1 min-w-[68px] text-center py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition ${
                active ? "bg-discipline text-black" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
