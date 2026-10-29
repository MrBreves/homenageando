import type { Metadata } from "next";
import Link from "next/link";
import styles from "./faq.module.css";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description:
    "Tire suas dúvidas sobre músicas personalizadas, preview, disponibilidade, pagamento e atendimento do Homenageando.",
  alternates: {
    canonical: "/faq",
  },
};

const grupos = [
  {
    titulo: "Sobre sua homenagem",
    perguntas: [
      {
        pergunta: "Como funciona o Homenageando?",
        resposta:
          "Você responde a um questionário sobre a pessoa homenageada, a ocasião e as histórias que deseja transformar em música. Essas informações orientam a criação da letra e da música com inteligência artificial.",
      },
      {
        pergunta: "Preciso saber escrever uma letra ou entender de música?",
        resposta:
          "Não. Conte sua história com suas próprias palavras. Nomes, lembranças, sentimentos e detalhes importantes ajudam a construir uma homenagem mais pessoal.",
      },
      {
        pergunta: "Posso homenagear uma pessoa de qualquer idade?",
        resposta:
          "Sim. A homenagem pode ser destinada a pessoas de qualquer idade. O cadastro e a compra por menores devem ficar sob responsabilidade de um adulto.",
      },
      {
        pergunta: "Preciso criar uma conta antes de começar?",
        resposta:
          "Você pode começar o questionário sem estar conectado. Antes de iniciar a geração da música, será necessário entrar na sua conta ou fazer o cadastro.",
      },
      {
        pergunta: "Por que os campos do questionário são obrigatórios?",
        resposta:
          "As respostas ajudam a dar contexto e coerência à homenagem. Preencha os campos exibidos com informações verdadeiras e relevantes. Se algo não se aplicar, explique isso no campo quando ele permitir uma resposta em texto.",
      },
      {
        pergunta: "Posso alterar as respostas depois de iniciar a geração?",
        resposta:
          "Revise todas as informações antes de gerar. Depois que a geração começa, o questionário fica bloqueado para preservar os dados usados na criação. Se perceber um problema, entre em contato com o atendimento.",
      },
    ],
  },
  {
    titulo: "Preview e disponibilidade",
    perguntas: [
      {
        pergunta: "O que é o preview da música?",
        resposta:
          "É um trecho de aproximadamente 35 segundos para você conhecer o resultado antes da compra. O preview não corresponde ao arquivo completo da música.",
      },
      {
        pergunta: "Quantas vezes posso ouvir o preview?",
        resposta:
          "O limite aprovado é de 5 reproduções por solicitação. As reproduções são contabilizadas; atualizar a página não deve renovar esse limite.",
      },
      {
        pergunta: "Por quanto tempo o preview fica disponível sem compra?",
        resposta:
          "Por 10 dias corridos, contados a partir da conclusão da geração da música, respeitado o limite de 5 reproduções.",
      },
      {
        pergunta: "Por quanto tempo a música comprada fica disponível?",
        resposta:
          "A música completa e a letra ficam disponíveis por 25 dias corridos a partir da aprovação do pagamento. Esse prazo é de disponibilidade no site, não de duração dos arquivos que você salvar no seu dispositivo.",
      },
      {
        pergunta: "O que devo fazer antes de terminar o prazo de 25 dias?",
        resposta:
          "Salve a música e a letra no seu dispositivo dentro do prazo de disponibilidade. Não conte com o acesso pelo site depois do vencimento.",
      },
      {
        pergunta: "A música completa é liberada antes do pagamento?",
        resposta:
          "Não. Antes da compra, o acesso é ao preview. A liberação da música completa e da letra está vinculada à aprovação do pagamento.",
      },
    ],
  },
  {
    titulo: "Cancelamento e atendimento",
    perguntas: [
      {
        pergunta: "Posso desistir antes de pagar?",
        resposta:
          "Sim. Antes do pagamento, você pode desistir sem cobrança.",
      },
      {
        pergunta: "Posso solicitar reembolso depois do pagamento?",
        resposta:
          "A política aprovada prevê solicitação de reembolso integral em até 7 dias corridos após a liberação da música completa e da letra depois do pagamento, mesmo que você já tenha acessado ou baixado os arquivos.",
      },
      {
        pergunta: "E se houver falha na entrega ou no conteúdo contratado?",
        resposta:
          "Entre em contato para que o caso seja analisado. O prazo de 7 dias não elimina os direitos aplicáveis a falhas na entrega ou a conteúdo em desacordo com o contratado.",
      },
      {
        pergunta: "Como solicito ajuda ou reembolso?",
        resposta:
          "Use a página Contato ou envie um e-mail para marcio.breves@gmail.com. Informe o e-mail usado na conta, o número da OS quando disponível e descreva sua solicitação. Não envie sua senha nem dados completos de cartão.",
      },
      {
        pergunta: "Solicitar reembolso significa receber o estorno imediatamente?",
        resposta:
          "Não. A solicitação é encaminhada ao atendimento e o estorno depende do processamento pelo meio de pagamento. A confirmação de recebimento da solicitação não é uma confirmação de que o valor já foi devolvido.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <section className={styles.page} aria-labelledby="faq-title">
      <div className={styles.card}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>Como podemos ajudar?</p>
          <h1 id="faq-title">Perguntas frequentes</h1>
          <p>
            Encontre respostas sobre sua homenagem, os prazos de
            disponibilidade e o atendimento.
          </p>
        </header>

        {grupos.map((grupo, indice) => (
          <section
            className={styles.group}
            key={grupo.titulo}
            aria-labelledby={`faq-group-${indice}`}
          >
            <h2 id={`faq-group-${indice}`}>{grupo.titulo}</h2>

            <div className={styles.questions}>
              {grupo.perguntas.map((item) => (
                <details className={styles.item} key={item.pergunta}>
                  <summary className={styles.question}>
                    <span>{item.pergunta}</span>
                    <span className={styles.icon} aria-hidden="true" />
                  </summary>
                  <div className={styles.answer}>
                    <p>{item.resposta}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <aside className={styles.help}>
          <h2>Ainda precisa de ajuda?</h2>
          <p>
            Fale com a gente sobre sua dúvida ou sobre uma solicitação
            específica.
          </p>
          <Link href="/contato" className={styles.button}>
            Entrar em contato
          </Link>
        </aside>

        <nav className={styles.legal} aria-label="Informações complementares">
          <Link href="/termos">Termos de Uso</Link>
          <Link href="/privacidade">Política de Privacidade</Link>
        </nav>
      </div>
    </section>
  );
}