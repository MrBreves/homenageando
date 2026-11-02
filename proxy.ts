import { NextResponse } from "next/server";

// Acesso publico ao site.
// A autenticacao de clientes, administradores e APIs
// permanece sob responsabilidade das respectivas rotas.

export function proxy() {
  return NextResponse.next();
}