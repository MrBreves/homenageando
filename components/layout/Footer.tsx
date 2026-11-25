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
        <nav className="footer-legal" aria-label="Redes sociais oficiais">
          <a href="https://www.youtube.com/@Homenageandomusicas" target="_blank" rel="noopener noreferrer" aria-label="YouTube do Homenageando (abre em nova aba)" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
            </svg>
          </a>
        </nav>
        <p>homenageando.com.br</p>

        <nav className="footer-legal" aria-label="Documentos legais">
          <Link href="/faq">Perguntas frequentes</Link>
          <Link href="/contato">Contato</Link>
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