# AGENTS.md

Projeto independente. O GitHub (`main`) é a única fonte de verdade — não há mais
sincronização com o editor Lovable.

- Mantenha `main` sempre em estado funcional (`npm run build` + `npx tsc --noEmit` passando).
- Evite reescrever histórico já publicado (sem force-push / rebase / amend de commits enviados).
- Segredos só via variáveis de ambiente; nunca commite `.env` (ver `.env.example`).
- Guia de arquitetura e comandos: `CLAUDE.md`. Regras permanentes: `.claude/rules/`.
