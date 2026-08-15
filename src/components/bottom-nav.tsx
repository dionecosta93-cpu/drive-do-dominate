import { Link, useRouterState } from "@tanstack/react-router";
import { Home, CalendarDays, BarChart3, BookMarked, Wallet, ShoppingCart } from "lucide-react";

const items = [
  { to: "/", label: "Início", icon: Home },
  { to: "/calendar", label: "Agenda", icon: CalendarDays },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/reading", label: "Leitura", icon: BookMarked },
  { to: "/shopping", label: "Compras", icon: ShoppingCart },
  { to: "/finance", label: "Finanças", icon: Wallet },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto max-w-[440px] grid grid-cols-6 h-16">
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex flex-col items-center justify-center gap-1 text-[8px] font-bold uppercase tracking-wider transition-colors ${
                active ? "text-discipline" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" strokeWidth={active ? 2.5 : 1.75} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
