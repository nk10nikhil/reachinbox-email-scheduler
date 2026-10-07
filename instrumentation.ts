export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initBackendServices } = await import('./lib/backend-init');
    await initBackendServices();
  }
}
