# Regras de Git (permanentes)

- Branch oficial: `main` — única fonte de verdade (projeto independente, sem sync Lovable).
- Nunca reescrever histórico já publicado (sem force-push / rebase / amend / squash
  de commits já enviados).
- Mantenha `main` sempre funcional: `npm run build` + `npx tsc --noEmit` + `npm run lint` passando.
- Commits claros e agrupados por assunto. Nada de commits triviais/intermediários.
- Nunca commitar `.env`, chaves reais ou dados sensíveis (só `.env.example`).
- `src/routeTree.gen.ts` é gerado (o plugin reordena imports entre versões) — não editar à mão;
  regenerado por `npm run dev` / `npm run build`.
