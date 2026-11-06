// Next.js: inicialização do processo servidor. Não cria endpoint novo.
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.npm_lifecycle_event === "start"
  ) {
    await import("./lib/music-recovery-scheduler");
  }
}
