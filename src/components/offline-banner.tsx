import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Aviso discreto de perda de conexão. O app continua funcionando com os dados
 * já carregados; funções que exigem internet (IA, voz, sincronização) avisam aqui.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[70] flex items-center justify-center gap-2 bg-struggle px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white"
    >
      <WifiOff className="size-3.5" />
      Sem conexão — IA, voz e sincronização voltam quando a internet retornar.
    </div>
  );
}
