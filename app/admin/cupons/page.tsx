"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";

type Cupom = {
  id: string;
  code: string;
  discount_percent: number | null;
  discount_fixed_cents: number | null;
  active: boolean;
  valid_from: string;
  expires_at: string | null;
  max_redemptions: number;
  per_user_limit: number;
  created_at: string;
  used_count: number;
  reserved_count: number;
  orders: Array<{ os_number: number | null; order_id: string; status: string }>;
};
type Resposta = { success: boolean; error?: string; coupons?: Cupom[] };
const dinheiro = (n: number) => (n / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = (s: string | null) => s ? new Date(s).toLocaleDateString("pt-BR") : "Sem prazo";

export default function CuponsAdminPage() {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<"percent" | "fixed">("percent");
  const [valor, setValor] = useState("100");
  const [limite, setLimite] = useState("1");
  const [porUsuario, setPorUsuario] = useState("1");
  const [inicio, setInicio] = useState("");
  const [validade, setValidade] = useState("");

  const chamar = useCallback(async (method: "GET" | "POST" | "PATCH", payload?: Record<string, unknown>): Promise<Resposta> => {
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.access_token) throw new Error("Faça login com a conta administradora.");
    const resposta = await fetch("/api/admin/cupons", {
      method,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(payload ? { "Content-Type": "application/json" } : {}) },
      body: payload ? JSON.stringify(payload) : undefined,
      cache: "no-store",
    });
    const json = await resposta.json() as Resposta;
    if (!resposta.ok || !json.success) throw new Error(json.error ?? "Falha na operação.");
    return json;
  }, []);

  const carregar = useCallback(async () => {
    try {
      const resultado = await chamar("GET");
      setCupons(resultado.coupons ?? []);
      setErro("");
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao carregar cupons."); }
    finally { setCarregando(false); }
  }, [chamar]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function criar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true); setErro(""); setSucesso("");
    const inteiro = Number(limite), limiteUsuario = Number(porUsuario);
    const numero = Number(valor.replace(",", "."));
    const cents = Math.round(numero * 100);
    if (!codigo.trim() || !Number.isInteger(inteiro) || inteiro < 1 || !Number.isInteger(limiteUsuario) || limiteUsuario < 1 || limiteUsuario > inteiro || !Number.isFinite(numero) || numero <= 0 || (tipo === "percent" && (!Number.isInteger(numero) || numero > 100)) || (tipo === "fixed" && cents < 1) || !validade) {
      setErro("Confira código, desconto, limites e validade."); setSalvando(false); return;
    }
    try {
      await chamar("POST", {
        code: codigo.trim().toUpperCase(),
        discount_percent: tipo === "percent" ? numero : null,
        discount_fixed_cents: tipo === "fixed" ? cents : null,
        max_redemptions: inteiro,
        per_user_limit: limiteUsuario,
        valid_from: inicio ? new Date(`${inicio}T00:00:00`).toISOString() : new Date().toISOString(),
        expires_at: new Date(`${validade}T23:59:59`).toISOString(),
      });
      setSucesso("Cupom criado."); setCodigo(""); await carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível criar o cupom."); }
    finally { setSalvando(false); }
  }

  async function alternar(cupom: Cupom) {
    const acao = cupom.active ? "desativar" : "ativar";
    if (!window.confirm(`Confirma ${acao} o cupom ${cupom.code}?`)) return;
    setSalvando(true); setErro(""); setSucesso("");
    try {
      await chamar("PATCH", { id: cupom.id, active: !cupom.active });
      setSucesso(`Cupom ${cupom.code} ${cupom.active ? "desativado" : "ativado"}.`);
      await carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : "Erro ao alterar cupom."); }
    finally { setSalvando(false); }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>HOMENAGEANDO / ADMIN</p><h1 className={styles.title}>Gerenciamento de cupons</h1><p className={styles.subtitle}>Descontos, cortesias, limites e histórico por OS.</p></div>
          <Link href="/admin" className={styles.back}>Voltar ao painel</Link>
        </header>
        {erro && <p className={styles.error} role="alert">{erro}</p>}
        {sucesso && <p className={styles.success} role="status">{sucesso}</p>}
        <div className={styles.grid}>
          <section className={styles.card}>
            <h2>Criar cupom</h2><p className={styles.note}>Novos cupons começam ativos. O desconto será limitado ao valor da compra.</p>
            <form className={styles.form} onSubmit={criar}>
              <label className={styles.field}>Código<input className={styles.input} value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase())} placeholder="EXEMPLO100" maxLength={64} required /></label>
              <label className={styles.field}>Modalidade<select className={styles.select} value={tipo} onChange={e=>{setTipo(e.target.value as "percent" | "fixed");setValor("");}}><option value="percent">Percentual (%)</option><option value="fixed">Valor fixo (R$)</option></select></label>
              <label className={styles.field}>{tipo === "percent" ? "Desconto (%)" : "Desconto (R$)"}<input className={styles.input} type="text" inputMode="decimal" value={valor} onChange={e=>setValor(e.target.value)} placeholder={tipo === "percent" ? "100" : "10,00"} required /></label>
              <div className={styles.row}><label className={styles.field}>Usos máximos<input className={styles.input} type="number" min="1" max="100000" value={limite} onChange={e=>setLimite(e.target.value)} required /></label><label className={styles.field}>Por cliente<input className={styles.input} type="number" min="1" value={porUsuario} onChange={e=>setPorUsuario(e.target.value)} required /></label></div>
              <label className={styles.field}>Início (opcional)<input className={styles.input} type="date" value={inicio} onChange={e=>setInicio(e.target.value)} /></label>
              <label className={styles.field}>Válido até<input className={styles.input} type="date" value={validade} onChange={e=>setValidade(e.target.value)} required /></label>
              <button className={styles.button} type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Criar cupom"}</button>
            </form>
          </section>
          <section className={styles.card}>
            <div className={styles.bar}><h2>Cupons cadastrados ({cupons.length})</h2><button type="button" className={styles.secondary} onClick={()=>void carregar()} disabled={carregando||salvando}>Atualizar</button></div>
            {carregando ? <p className={styles.note}>Carregando cupons...</p> : cupons.length === 0 ? <p className={styles.note}>Nenhum cupom encontrado.</p> : (
              <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Cupom</th><th>Desconto</th><th>Utilizações</th><th>Validade</th><th>Estado</th><th>Ação</th></tr></thead><tbody>
                {cupons.map(c=><tr key={c.id}>
                  <td>{c.code}<div className={styles.muted}>{c.orders.length ? c.orders.map(o=>`OS ${o.os_number ?? "—"} (${o.status})`).join(", ") : "Nenhuma OS vinculada"}</div></td>
                  <td>{c.discount_percent != null ? `${c.discount_percent}%` : dinheiro(c.discount_fixed_cents ?? 0)}</td>
                  <td>{c.used_count} / {c.max_redemptions}<div className={styles.muted}>{c.reserved_count} reservados</div></td>
                  <td>{data(c.expires_at)}</td>
                  <td><span className={`${styles.badge} ${c.active ? styles.statusActive : styles.statusInactive}`}>{c.active ? "Ativo" : "Inativo"}</span></td>
                  <td><button type="button" className={styles.secondary} disabled={salvando} onClick={()=>void alternar(c)}>{c.active ? "Desativar" : "Ativar"}</button></td>
                </tr>)}
              </tbody></table></div>
            )}
            <p className={styles.note} style={{marginTop:14}}>Utilizações concluídas e reservas são informadas separadamente. A ativação não prorroga a validade do cupom.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
