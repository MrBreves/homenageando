import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata = publicMetadata("/termos", "Termos de Uso", "Conheça os termos de uso do serviço de criação de músicas personalizadas do Homenageando.");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
