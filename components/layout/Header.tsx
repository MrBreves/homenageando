import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-content">
        <Link href="/" className="brand" aria-label="Homenageando — início">
          <span className="brand-icon" aria-hidden="true">♪</span>
          <span>Homenageando</span>
        </Link>

        <nav className="header-actions" aria-label="Navegação principal">
          <Link href="/criar" className="header-create">
            Criar música
          </Link>
          <Link href="/login" className="header-login">
            Entrar
          </Link>
        </nav>
      </div>
    </header>
  );
}
