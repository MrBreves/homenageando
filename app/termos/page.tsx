export default function TermosPage() {
  return (
    <article className="legal-page" aria-labelledby="termos-title">
      <div className="legal-card">
        <header>
          <p className="legal-eyebrow">Homenageando</p>
          <h1 id="termos-title">Termos de Uso</h1>
          <p>Versão inicial — 14 de outubro de 2026.</p>
        </header>

        <aside className="legal-notice">
          Documento em revisão antes da publicação comercial.
          A identificação completa do fornecedor e a implementação das
          condições descritas precisam ser concluídas.
        </aside>

        <section>
          <h2>1. Sobre o serviço</h2>
          <p>
            O Homenageando cria músicas personalizadas com auxílio de
            inteligência artificial, a partir das informações fornecidas
            pelo cliente. A oferta apresentada antes do pagamento informa
            o preço, os itens incluídos e as condições de entrega.
          </p>
          <p>
            O responsável pelo serviço é Márcio Breves, atuando como
            pessoa física. O contato para atendimento é{" "}
            <a href="mailto:marcio.breves@gmail.com">
              marcio.breves@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2>2. Cadastro e responsabilidade</h2>
          <p>
            Forneça informações corretas e mantenha suas credenciais
            protegidas. O cadastro e a contratação por menores de idade
            devem ocorrer sob responsabilidade de um adulto legalmente
            responsável.
          </p>
          <p>
            A homenagem pode ser destinada a pessoas de qualquer idade.
            Informe apenas os dados necessários e respeite a privacidade
            e os direitos das pessoas mencionadas.
          </p>
        </section>

        <section>
          <h2>3. Informações para a criação</h2>
          <p>
            Confira nomes, mensagens e detalhes antes de solicitar a
            geração. Não envie conteúdo ilícito, discriminatório,
            ameaçador ou que viole direitos de terceiros, nem letras
            protegidas sem autorização.
          </p>
          <p>
            A criação com inteligência artificial pode apresentar
            variações de interpretação e pronúncia. Isso não afasta
            o compromisso com a oferta nem os direitos do consumidor
            em caso de falha ou entrega em desacordo com o contratado.
          </p>
        </section>

        <section>
          <h2>4. Preview e compra</h2>
          <p>
            Antes da compra, o cliente recebe acesso ao preview, com
            limite de cinco reproduções. O acesso à música completa
            e à letra depende da aprovação do pagamento.
          </p>
          <p>
            Antes do pagamento, é possível desistir sem cobrança.
            Confira o valor e os itens da oferta antes de concluir a compra.
          </p>
        </section>

        <section className="legal-highlight">
          <h2>5. Prazo de disponibilidade</h2>
          <ul>
            <li>
              <strong>Sem compra:</strong> preview disponível por
              10 dias corridos após a conclusão da geração.
            </li>
            <li>
              <strong>Com compra:</strong> música completa e letra
              disponíveis por 25 dias corridos após a aprovação
              do pagamento.
            </li>
          </ul>
          <p>
            Faça o download dos arquivos comprados antes do vencimento.
            Após o prazo, o acesso pelo site poderá ser encerrado.
            A data de vencimento será apresentada com destaque.
          </p>
          <p>
            O encerramento da disponibilidade não elimina direitos
            relativos a falhas na entrega ou ao atendimento.
          </p>
        </section>

        <section>
          <h2>6. Cancelamento e reembolso</h2>
          <p>
            Após o pagamento, o cliente poderá solicitar reembolso
            integral em até sete dias corridos contados da liberação
            da música completa e da letra, inclusive se já tiver
            acessado ou baixado os arquivos, sem prejuízo dos
            direitos previstos na legislação.
          </p>
          <p>
            A solicitação poderá ser feita pelo canal de atendimento
            do site ou pelo e-mail{" "}
            <a href="mailto:marcio.breves@gmail.com">
              marcio.breves@gmail.com
            </a>.
            Informe o e-mail da conta e a identificação do pedido.
            Não envie senhas ou dados completos de cartão.
          </p>
          <p>
            O recebimento será confirmado imediatamente e o estorno
            será encaminhado ao meio de pagamento. A apresentação
            do crédito depende do processamento da instituição responsável.
          </p>
          <p>
            Falhas de entrega ou conteúdo em desacordo com a contratação
            serão atendidos também após esse prazo, preservando as
            soluções e os direitos previstos na legislação.
          </p>
        </section>

        <section>
          <h2>7. Privacidade</h2>
          <p>
            O uso de dados pessoais está descrito na{" "}
            <a href="/privacidade">Política de Privacidade</a>.
            O aceite destes termos não constitui autorização genérica
            para publicidade ou para usos de dados sem relação com o serviço.
          </p>
        </section>

        <section>
          <h2>8. Atendimento e alterações</h2>
          <p>
            Dúvidas sobre pedidos, pagamentos, arquivos ou privacidade
            podem ser encaminhadas ao contato informado neste documento.
            Atualizações destes termos não reduzirão retroativamente
            direitos de compras já realizadas.
          </p>
        </section>

        <nav className="legal-navigation" aria-label="Links relacionados">
          <a href="/cadastro">Ir para o cadastro</a>
          <a href="/privacidade">Política de Privacidade</a>
        </nav>
      </div>
    </article>
  );
}