import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata = publicMetadata("/contato", "Contato", "Fale com o atendimento do Homenageando sobre dúvidas, músicas, pagamentos e solicitações.");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
