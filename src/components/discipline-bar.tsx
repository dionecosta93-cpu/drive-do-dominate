import { useStore } from "@/lib/store";
import { DISCIPLINE_MAX, disciplineTier } from "@/lib/discipline";
import { ShieldCheck } from "lucide-react";

export function DisciplineBar({ compact = false }: { compact?: boolean }) {
  const discipline = useStore((s) => s.discipline);
  const tier = disciplineTier(discipline);
  const pct = Math.round((discipline / DISCIPLINE_MAX) * 100);

  return (
    <div className={`bg-surface border border-border rounded-2xl ${compact ? "p-3" : "p-4"}`}>
      <div className="flex justify-between items-end mb-2">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <ShieldCheck className="size-4" style={{ color: tier.color }} /> Disciplina
        </span>
        <span className="font-heading font-black text-lg tabular-nums" style={{ color: tier.color }}>
          {discipline}
          <span className="text-[10px] text-muted-foreground font-medium">/{DISCIPLINE_MAX}</span>
        </span>
      </div>
      <div className="h-3 w-full bg-background rounded-full overflow-hidden border border-border">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
          style={{
            width: `${Math.max(pct, 2)}%`,
            background: `linear-gradient(90deg, ${tier.color}80, ${tier.color})`,
            boxShadow: `0 0 12px ${tier.color}66`,
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)] animate-[shimmer_2.5s_infinite]" />
        </div>
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-widest font-bold" style={{ color: tier.color }}>
        Nível {tier.name}
      </p>
    </div>
  );
}
