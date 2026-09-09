# Regras de Git (permanentes)

- Branch oficial: `main`. É a fonte de verdade e sincroniza com o editor Lovable.
- **Nunca** reescrever histórico já publicado (sem force-push / rebase / amend / squash
  de commits já enviados) — ver `AGENTS.md`. Quebra o histórico no lado do Lovable.
- Mantenha `main` sempre em estado funcional (build + typecheck passando).
- Commits claros e agrupados por assunto. Não criar commits triviais/intermediários.
- Ao concluir uma alteração coesa: um commit e push.
- Nunca commitar `.env`, chaves reais ou dados sensíveis.
- `src/routeTree.gen.ts` é gerado (o plugin reordena imports entre versões) — não editar à mão;
  regenerado por `npm run dev` / `npm run build`.
