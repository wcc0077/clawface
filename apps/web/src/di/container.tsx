import { createContext, useContext, type ReactNode } from "react";
import type { DIContainer } from "@openclaw/web-application";

const DIContext = createContext<DIContainer | null>(null);

interface DIProviderProps {
  container: DIContainer;
  children: ReactNode;
}

export function DIProvider({ container, children }: DIProviderProps) {
  return <DIContext.Provider value={container}>{children}</DIContext.Provider>;
}

export function useDIContainer(): DIContainer {
  const container = useContext(DIContext);
  if (!container) {
    throw new Error("useDIContainer must be used within DIProvider");
  }
  return container;
}
