import type { ReactNode } from "react";

type PageFrameProps = {
  children: ReactNode;
};

export function PageFrame({ children }: PageFrameProps) {
  return (
    <main className="mx-auto min-h-[calc(100vh-var(--app-header-height))] w-full max-w-7xl px-5 py-12 sm:px-8 lg:py-20">
      {children}
    </main>
  );
}
