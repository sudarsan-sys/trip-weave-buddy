import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwaSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect if already installed / standalone
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  // Trigger browser install prompt
  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
      setDeferredPrompt(null);
      toast.success("TripOS installed successfully!");
    }
  }, [deferredPrompt]);

  // Sync latest version from server
  const syncChanges = useCallback(async () => {
    setIsSyncing(true);
    toast.info("Checking for latest updates...");

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          // Tell service worker to clear all caches
          if (navigator.serviceWorker.controller) {
            const messageChannel = new MessageChannel();
            navigator.serviceWorker.controller.postMessage(
              { type: "SYNC_LATEST_VERSION" },
              [messageChannel.port2]
            );
          }

          // Trigger update check
          await registration.update();
        }
      }

      // Hard reload bypassing cache
      setTimeout(() => {
        toast.success("Synced to latest version!");
        window.location.reload();
      }, 600);
    } catch (err) {
      console.error("Sync failed:", err);
      window.location.reload();
    }
  }, []);

  return {
    isSyncing,
    canInstall,
    isStandalone,
    installApp,
    syncChanges,
  };
}
