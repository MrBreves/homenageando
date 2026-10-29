
import type { ReactNode } from "react";

export const metadata = {
  title: "Acompanhar exclusão | Homenageando",
  robots: {
    index: false,
    follow: false,
  },
  referrer: "no-referrer",
};

export default function StatusLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
