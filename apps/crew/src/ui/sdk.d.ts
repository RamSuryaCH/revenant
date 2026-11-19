// The Kiro Crew host provides these modules at runtime through an import map.
// Only the parts this app uses are declared.
declare module "@kirocrew/app-sdk" {
  export interface AppApi {
    get<T = unknown>(path: string): Promise<T>;
    post<T = unknown>(path: string, body?: unknown): Promise<T>;
  }
  export function useAppApi(): AppApi;
  export function useNotify(): (message: string, opts?: { type?: "info" | "success" | "error" }) => void;
  export function useChatLauncher(): { openChat: (opts?: { agent?: string; message?: string; autoSend?: boolean }) => void };
}

declare module "@kirocrew/app-sdk/ui" {
  import type { ReactNode } from "react";
  export function PageHeader(props: { title: string; subtitle?: string; children?: ReactNode }): ReactNode;
}
