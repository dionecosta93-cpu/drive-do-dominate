import { createFileRoute } from "@tanstack/react-router";
import { library } from "@/lib/quotes";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/motivation")({
  component: Motivation,
  head: () => ({
    meta: [
      { title: "Motivação — Disciplina Absoluta" },
      {
        name: "description",
        content:
          "Biblioteca de frases separadas por Disciplina, Negócios, Treino, Estudo, Vida e Persistência.",
      },
    ],
  }),
});

function Motivation() {
  const cats = Object.keys(library);
  const [active, setActive] = useState<string>(cats[0]);
  return (
    <div className="px-5 pt-8 animate-rise">
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-4">Biblioteca</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border transition ${
              active === c
                ? "bg-discipline text-black border-discipline"
                : "bg-surface text-muted-foreground border-border"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {library[active].map((q, i) => (
          <blockquote key={i} className="bg-surface border border-border rounded-2xl p-5">
            <p className="text-base italic leading-snug text-pretty">"{q}"</p>
          </blockquote>
        ))}
      </div>
    </div>
  );
}
