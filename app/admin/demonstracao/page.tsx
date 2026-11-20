import type { Metadata } from "next";
import QuestionnaireDemo from "@/components/questionnaire/QuestionnaireDemo";

export const metadata: Metadata = {
  title: "Modo demonstração",
  robots: { index: false, follow: false },
};

export default function DemonstracaoPage() {
  return <QuestionnaireDemo />;
}
