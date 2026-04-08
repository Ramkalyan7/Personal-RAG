import type { ReactNode } from "react";

type PageFrameProps = {
  children: ReactNode;
  className?: string;
};

export function PageFrame({ children, className }: PageFrameProps) {
  return (
    <main
      className={`mx-auto min-h-[calc(100vh-var(--app-header-height))] w-full max-w-7xl px-5 py-12 sm:px-8 lg:py-20${className ? ` ${className}` : ""}`}
    >
      {children}
    </main>
  );
}
