
export const metadata = {
  title: "Exclusão de dados | Homenageando",
  description: "Como solicitar a exclusão da conta e acompanhar seu pedido no Homenageando.",
};

export default function ExclusaoDeDadosPage() {
  return (
    <article className="legal-page" aria-labelledby="exclusao-title">
      <div className="legal-card">
        <header>
          <p className="legal-eyebrow">Homenageando</p>
          <h1 id="exclusao-title">Exclusão de conta e dados</h1>
        </header>
        <section>
          <h2>Como solicitar</h2>
          <ol>
            <li>Entre na sua conta pelo método disponível que você utiliza.</li>
            <li>Abra <a href="/minha-conta">Minha conta</a> e selecione “Excluir minha conta”.</li>
            <li>Leia o aviso, digite EXCLUIR e confirme.</li>
            <li>Guarde o protocolo e o endereço de acompanhamento exibidos.</li>
          </ol>
          <p>O procedimento também se aplica às contas criadas com Facebook e Google.</p>
          <p>
            Se não conseguir entrar, solicite ajuda pelo <a href="/contato">formulário de contato</a>
            {" "}ou por <a href="mailto:marcio.breves@gmail.com">marcio.breves@gmail.com</a>.
            Informe que deseja excluir a conta e o e-mail utilizado no cadastro.
            Nunca envie sua senha. Poderemos confirmar sua identidade para proteger seus dados.
          </p>
        </section>
        <section>
          <h2>O que acontece com os dados</h2>
          <p>
            A exclusão encerra o acesso e elimina cadastro e conteúdos pessoais vinculados,
            incluindo questionários, letras, músicas, previews e arquivos. É irreversível.
            Baixe antes o que deseja guardar. A solicitação bloqueia novas operações enquanto
            o processamento é concluído. Não equivale a um pedido automático de reembolso.
          </p>
          <p>
            Registros mínimos de transações e documentos necessários para obrigações legais
            ou exercício regular de direitos poderão ser mantidos separadamente, com acesso
            restrito, pelo prazo aplicável. Isso não autoriza a conservação das suas músicas
            ou histórias para marketing. Um novo cadastro não restaura o conteúdo eliminado.
          </p>
          <p>
            Falhas técnicas ou pendências que precisem de análise aparecerão no acompanhamento.
            Não prometemos a remoção instantânea de cópias já baixadas, caches externos ou backups.
            Consulte a <a href="/privacidade">Política de Privacidade</a> para mais informações.
          </p>
        </section>
        <nav className="legal-navigation" aria-label="Links relacionados">
          <a href="/minha-conta">Minha conta</a>
          <a href="/exclusao-de-dados/status">Consultar protocolo</a>
          <a href="/contato">Contato</a>
        </nav>
      </div>
    </article>
  );
}
