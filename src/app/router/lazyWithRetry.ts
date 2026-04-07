import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type ModuleWithDefault = {
  default: ComponentType<unknown>;
};

const RETRY_KEY = "app:lazy-retry";

const isChunkLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("Loading chunk") ||
    message.includes("ChunkLoadError")
  );
};

export const lazyWithRetry = (
  importer: () => Promise<ModuleWithDefault>
): LazyExoticComponent<ComponentType<unknown>> =>
  lazy(async () => {
    try {
      const module = await importer();
      sessionStorage.removeItem(RETRY_KEY);
      return module;
    } catch (error) {
      const hasRetried = sessionStorage.getItem(RETRY_KEY) === "1";

      if (!hasRetried && isChunkLoadError(error)) {
        sessionStorage.setItem(RETRY_KEY, "1");
        window.location.reload();
        return new Promise<never>(() => {});
      }

      sessionStorage.removeItem(RETRY_KEY);
      throw error;
    }
  });
