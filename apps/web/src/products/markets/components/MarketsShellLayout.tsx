import type { ReactNode } from "react";

import Footer from "@/shared/components/Footer";
import Header, { type HeaderProps } from "@/shared/components/Header";

interface MarketsShellLayoutProps extends HeaderProps {
  children: ReactNode;
}

export function MarketsShellLayout({ children, ...headerProps }: MarketsShellLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header {...headerProps} />
      <main className="mx-auto max-w-screen-2xl px-5 pb-20 pt-10 lg:px-10 lg:pt-12">{children}</main>
      <Footer />
    </div>
  );
}
