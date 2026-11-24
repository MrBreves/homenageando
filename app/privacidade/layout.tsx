import type { ReactNode } from "react";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata = publicMetadata("/privacidade", "Política de Privacidade", "Conheça a política de privacidade e o tratamento de dados pessoais no Homenageando.");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
