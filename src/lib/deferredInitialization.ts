/** Independent post-paint tasks must not prevent unrelated tasks from starting. */
export type DeferredInitializer = {
  name: string;
  run: () => unknown | Promise<unknown>;
};

export async function runDeferredInitializers(
  tasks: readonly DeferredInitializer[],
  onFailure: (name: string, error: unknown) => void = (name, error) =>
    console.warn(`[Boot] ${name} initialization skipped (non-critical):`, error),
): Promise<void> {
  await Promise.all(tasks.map(async ({ name, run }) => {
    try {
      await run();
    } catch (error) {
      // Diagnostics must not turn a recoverable initializer failure into a rejection.
      try { onFailure(name, error); } catch { /* diagnostic sink unavailable */ }
    }
  }));
}