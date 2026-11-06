import { reconcilePendingMusic } from "./music-recovery-worker";

declare global {
  // Evita iniciar dois intervalos na mesma instância, inclusive em hot reload.
  // eslint-disable-next-line no-var
  var homenageandoMusicRecoveryStarted: boolean | undefined;
}

if (!globalThis.homenageandoMusicRecoveryStarted) {
  globalThis.homenageandoMusicRecoveryStarted = true;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      await reconcilePendingMusic();
    } catch (error) {
      console.error("[MUSIC_WORKER_UNEXPECTED]", error instanceof Error ? error.message : "unknown");
    } finally {
      running = false;
    }
  }

  const initial = setTimeout(() => { void tick(); }, 12000);
  initial.unref();

  const timer = setInterval(() => { void tick(); }, 60000);
  timer.unref();
  console.info("[MUSIC_WORKER_STARTED] Verificação de tarefas pendentes ativada.");
}
