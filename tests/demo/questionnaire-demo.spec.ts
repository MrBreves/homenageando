import { test, expect, type Page } from "@playwright/test";
import { createQuestionnaireExample, updateDemoAnswer } from "../../lib/questionnaire-demo";
import { questionnaireDefaults } from "../../lib/questionnaire-defaults";
import { validateQuestionnaire } from "../../data/questionnaire-steps";

const storageKey = "sb-demo-test-auth-token";
const user = { id: "test-admin", aud: "authenticated", role: "authenticated", email: "demo@example.test", user_metadata: { nome: "Demo" }, app_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const realDraft = '{"nomeUsuario":"Rascunho real preservado"}';

async function prepare(page: Page, mode: "admin" | "client" | "anonymous" | "failure" = "admin") {
  const blockedBusinessRequests: string[] = [];
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: expiresAt, role: "authenticated" })).toString("base64url");
  const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test-signature`, refresh_token: "test-refresh", token_type: "bearer", expires_in: 3600, expires_at: expiresAt, user };

  await page.addInitScript(({ storageKey, session, mode, realDraft }) => {
    if (sessionStorage.getItem("demo-test-initialized")) return;
    sessionStorage.setItem("demo-test-initialized", "true");
    if (mode !== "anonymous") localStorage.setItem(storageKey, JSON.stringify(session));
    localStorage.setItem("homenageando_questionnaire", realDraft);
    localStorage.setItem("homenageando_questionnaire_step", "4");
  }, { storageKey, session, mode, realDraft });

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" && url.hostname !== "demo-test.supabase.co") {
      await route.abort();
      return;
    }
    if (url.hostname === "demo-test.supabase.co") {
      if (url.pathname === "/auth/v1/user") {
        await route.fulfill({ json: user });
      } else if (url.pathname.startsWith("/auth/")) {
        await route.fulfill({ json: {} });
      } else {
        blockedBusinessRequests.push(route.request().method() + " " + url.pathname);
        await route.fulfill({ status: 500, json: { error: "Unexpected database request in demo" } });
      }
      return;
    }
    if (url.pathname === "/api/admin/access") {
      await route.fulfill({ status: mode === "failure" ? 503 : 200, json: { isAdmin: mode === "admin" } });
      return;
    }
    if (url.pathname === "/api/admin/overview") {
      await route.fulfill({ json: { success: true, indicadores: { totalPedidos: 0, questionariosAbertos: 0, emGeracao: 0, musicasAbandonadas: 0, pagamentosPendentes: 0, musicasEntregues: 0 } } });
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      blockedBusinessRequests.push(route.request().method() + " " + url.pathname);
      await route.fulfill({ status: 500, json: {} });
      return;
    }
    await route.continue();
  });
  return blockedBusinessRequests;
}

test("o exemplo é completo, fictício e independente de cada preenchimento", () => {
  const first = createQuestionnaireExample();
  expect(validateQuestionnaire(first)).toBeNull();
  first.nomeUsuario = "Alterado";
  expect(createQuestionnaireExample().nomeUsuario).toBe("Lucas");
  expect(questionnaireDefaults.nomeUsuario).toBe("");
  const mother = updateDemoAnswer(createQuestionnaireExample(), "destinatario", "Minha mãe");
  expect(mother.ocasiao).toBe("");
  expect(mother.historiaRelacao).toBe("");
  expect(mother.nomeUsuario).toBe("Lucas");
  const birthday = updateDemoAnswer(createQuestionnaireExample(), "ocasiao", "Aniversário");
  expect(birthday.tipoComemoracao).toBe("");
  expect(birthday.tempoComemoracao).toBe("");
});

for (const mode of ["anonymous", "client", "failure"] as const) {
  test(`bloqueia demonstração: ${mode}`, async ({ page }) => {
    const requests = await prepare(page, mode);
    await page.goto("/admin/demonstracao");
    await expect(page.getByRole("link", { name: "Voltar ao painel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Preencher exemplo", exact: true })).toHaveCount(0);
    await expect(page.getByText("Modo demonstração ativo")).toHaveCount(0);
    expect(requests).toEqual([]);
  });
}

test("navega vazia pelas oito etapas e preenche sem chamadas comerciais ou alteração do rascunho real", async ({ page }) => {
  const requests = await prepare(page);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/admin");
  await page.getByRole("link", { name: "Ativar modo demonstração" }).click();
  await expect(page.getByText("Modo demonstração ativo")).toBeVisible();
  for (let step = 1; step < 8; step++) {
    await expect(page.getByText(`Etapa ${step} de 8`, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Próximo" }).click();
  }
  await expect(page.getByText("Etapa 8 de 8", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gerar música", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Voltar à primeira etapa" }).click();
  await page.getByRole("button", { name: "Preencher exemplo", exact: true }).click();
  await expect(page.getByLabel("Seu primeiro nome ou apelido", { exact: true })).toHaveValue("Lucas");
  await page.getByLabel("Seu primeiro nome ou apelido", { exact: true }).fill("Nome editado");
  await page.getByRole("button", { name: "Ir para etapa 4", exact: true }).click();
  await expect(page.getByPlaceholder("Ex.: 2 anos, 6 meses")).toHaveValue("10 anos");
  await page.getByRole("button", { name: "Ir para etapa 8", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nossa história continua" })).toBeVisible();
  await page.getByRole("button", { name: "Ir para etapa 1", exact: true }).click();
  await expect(page.getByLabel("Seu primeiro nome ou apelido", { exact: true })).toHaveValue("Nome editado");
  expect(await page.evaluate(() => localStorage.getItem("homenageando_questionnaire"))).toBe(realDraft);
  expect(await page.evaluate(() => localStorage.getItem("homenageando_questionnaire_step"))).toBe("4");
  await page.getByRole("link", { name: "Sair do modo demonstração" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("link", { name: "Ativar modo demonstração" }).click();
  await expect(page.getByLabel("Seu primeiro nome ou apelido", { exact: true })).toHaveValue("");
  expect(requests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("mobile: preencher, editar, limpar e atualizar não preservam dados demonstrativos", async ({ page }) => {
  const requests = await prepare(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/demonstracao");
  await page.getByRole("button", { name: "Preencher exemplo", exact: true }).click();
  for (let step = 1; step <= 8; step++) {
    await page.getByRole("button", { name: `Ir para etapa ${step}`, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "Limpar exemplo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Homenagem especial", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Preencher exemplo", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Seu primeiro nome ou apelido", { exact: true })).toHaveValue("");
  expect(requests).toEqual([]);
});

test("sair da conta em outra aba encerra a demonstração aberta", async ({ page }) => {
  await prepare(page);
  await page.goto("/admin/demonstracao");
  await page.getByRole("button", { name: "Preencher exemplo", exact: true }).click();
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    const channel = new BroadcastChannel(key);
    channel.postMessage({ event: "SIGNED_OUT", session: null });
    channel.close();
  }, storageKey);
  await expect(page.getByRole("link", { name: "Voltar ao painel" })).toBeVisible();
  await expect(page.getByText("Modo demonstração ativo")).toHaveCount(0);
});

test("fluxo normal continua exigindo respostas antes de avançar", async ({ page }) => {
  await prepare(page, "client");
  await page.route("https://demo-test.supabase.co/rest/v1/orders**", (route) => route.fulfill({ json: {
    id: "test-order", user_id: user.id, os_number: 123, state: "QUESTIONÁRIO_ABERTO",
    questionnaire: questionnaireDefaults, current_step: 1,
  } }));
  await page.goto("/criar");
  await expect(page.getByText("Etapa 1 de 8", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Próximo" }).click();
  await expect(page.getByRole("dialog", { name: "Falta uma resposta" })).toBeVisible();
  await expect(page.getByText("Modo demonstração ativo")).toHaveCount(0);
});

test("fluxo normal continua recuperando pedidos pendentes de pagamento", async ({ page }) => {
  await prepare(page, "client");
  await page.route("https://demo-test.supabase.co/rest/v1/orders**", (route) => route.fulfill({ json: {
    id: "test-order", user_id: user.id, os_number: 123, state: "AGUARDANDO_PAGAMENTO",
    questionnaire: createQuestionnaireExample(), current_step: 8,
    original_amount_cents: 3990, discount_amount_cents: 0, payment_amount_cents: 3990,
  } }));
  await page.goto("/criar");
  await expect(page.getByRole("button", { name: "Pagar", exact: true })).toBeVisible();
  await expect(page.getByText("Modo demonstração ativo")).toHaveCount(0);
});

test("API administrativa rejeita requisição sem autenticação", async ({ request }) => {
  const response = await request.get("/api/admin/access");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ isAdmin: false });
});
