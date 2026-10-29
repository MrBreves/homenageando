import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-decoration">
        <div className="footer-signature">
          <span aria-hidden="true" />
          <p>MAIS QUE MÚSICAS, ETERNIZAMOS SENTIMENTOS</p>
          <span aria-hidden="true" />
        </div>

        <div className="footer-heart" aria-hidden="true">
          ♥
        </div>
      </div>

      <div className="footer-information">
        <p>www.homenageando.com.br</p>

        <nav className="footer-legal" aria-label="Documentos legais">
          <Link href="/termos" target="_blank" rel="noopener noreferrer">
            Termos de Uso
            <span className="footer-screen-reader"> (abre em nova aba)</span>
          </Link>

          <Link href="/privacidade" target="_blank" rel="noopener noreferrer">
            Política de Privacidade
            <span className="footer-screen-reader"> (abre em nova aba)</span>
          </Link>

          <Link href="/exclusao-de-dados" target="_blank" rel="noopener noreferrer">
            Exclusão de Conta
            <span className="footer-screen-reader"> (abre em nova aba)</span>
          </Link>
        </nav>


        <p>© Homenageando. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}