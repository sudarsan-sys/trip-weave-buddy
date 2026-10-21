import { usePwaSync } from "@/hooks/use-pwa-sync";
import { RefreshCw, Download } from "lucide-react";

export function SyncButton({ showInstall = true }: { showInstall?: boolean }) {
  const { isSyncing, canInstall, installApp, syncChanges } = usePwaSync();

  return (
    <div className="flex items-center gap-2">
      {showInstall && canInstall && (
        <button
          onClick={installApp}
          className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition"
          title="Install app to your home screen"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      )}

      <button
        onClick={syncChanges}
        disabled={isSyncing}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition disabled:opacity-60 shadow-xs"
        title="Sync latest updates from server"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
        <span className="hidden sm:inline">{isSyncing ? "Syncing…" : "Sync changes"}</span>
      </button>
    </div>
  );
}
