import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { BookForm } from "@/components/book-form";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/reading/new")({
  component: NewBook,
  head: () => ({
    meta: [
      { title: "Novo livro — Disciplina Absoluta" },
      { name: "description", content: "Cadastre um livro na sua biblioteca pessoal de leitura." },
      { property: "og:title", content: "Novo livro — Disciplina Absoluta" },
      { property: "og:description", content: "Cadastre um livro na sua biblioteca pessoal de leitura." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function NewBook() {
  const navigate = useNavigate();
  const addBook = useStore((s) => s.addBook);
  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <button onClick={() => history.back()} className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Voltar
      </button>
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Novo Livro</h1>
      <BookForm
        submitLabel="ADICIONAR"
        onCancel={() => history.back()}
        onSubmit={(v) => {
          const b = addBook(v);
          toast.success("Livro adicionado.");
          navigate({ to: "/reading/$id", params: { id: b.id } });
        }}
      />
    </div>
  );
}
