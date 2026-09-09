/**
 * Relato de erros do cliente, neutro de fornecedor.
 *
 * Hoje: registra no console. Os hooks `window.__lovable*` continuam sendo
 * chamados de forma opcional (`?.`) — só existem dentro do preview do editor
 * Lovable e são no-op em qualquer outro lugar; não há acoplamento em runtime.
 * Para enviar a um serviço próprio, plugue aqui (ex.: Sentry, ou a camada
 * `track` de analytics) sem tocar nos chamadores.
 */

type ReportContext = Record<string, unknown>;

type EditorHooks = {
  __lovableEvents?: {
    captureException?: (
      error: unknown,
      context?: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => void;
  };
  __lovableReportRuntimeError?: (payload: {
    message: string;
    stack?: string;
    filename?: string;
  }) => void;
};

export function reportError(error: unknown, context: ReportContext = {}): void {
  if (typeof window === "undefined") return;

  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  console.error("[error-boundary]", message, { route: window.location.pathname, ...context });

  const w = window as unknown as EditorHooks;
  w.__lovableEvents?.captureException?.(
    error,
    { source: "react_error_boundary", route: window.location.pathname, ...context },
    { mechanism: "react_error_boundary", handled: false, severity: "error" },
  );
  w.__lovableReportRuntimeError?.({
    message,
    stack: error instanceof Error ? error.stack : undefined,
    filename: window.location.pathname,
  });
}

/** @deprecated use `reportError` */
export const reportLovableError = reportError;
