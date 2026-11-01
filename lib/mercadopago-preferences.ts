
import "server-only";

const MERCADOPAGO_API =
  "https://api.mercadopago.com";

type CreatePreferenceInput = {
  orderId: string;
  orderNumber: string;
  buyerEmail: string;
  baseUrl: string;
  notificationUrl: string;
  totalAmountCents: number;
};

type MercadoPagoPreference = {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
};

export async function createMercadoPagoPreference(
  input: CreatePreferenceInput
): Promise<MercadoPagoPreference> {
  const token =
    process.env.PAYMENT_MODE === "mercadopago_prod"
      ? process.env.MERCADOPAGO_ACCESS_TOKEN_PROD?.trim()
      : process.env.PAYMENT_MODE === "mercadopago_test"
        ? process.env.MERCADOPAGO_ACCESS_TOKEN_TEST?.trim()
        : undefined;

  if (!token) {
    throw new Error(
      "Credencial do Mercado Pago não configurada."
    );
  }

  const {
    orderId,
    orderNumber,
    buyerEmail,
    baseUrl,
    notificationUrl,
    totalAmountCents,
  } = input;

  if (!orderId || !orderNumber || !buyerEmail) {
    throw new Error("Dados do pedido incompletos.");
  }

  if (
    !Number.isSafeInteger(totalAmountCents) ||
    totalAmountCents < 1 ||
    totalAmountCents > 3990
  ) {
    throw new Error(
      "Valor do pagamento inválido."
    );
  }

  const siteUrl = new URL(baseUrl);
  const webhookUrl = new URL(notificationUrl);

  if (
    siteUrl.protocol !== "https:" ||
    webhookUrl.protocol !== "https:"
  ) {
    throw new Error(
      "As URLs públicas do checkout devem utilizar HTTPS."
    );
  }

  const preference = {
    items: [
      {
        id: "musica-personalizada",
        title: "Música personalizada - Homenageando",
        quantity: 1,
        currency_id: "BRL",
        unit_price: totalAmountCents / 100,
      },
    ],
    payer: {
      email: buyerEmail,
    },
    external_reference: orderId,
    back_urls: {
      success: `${siteUrl.origin}/pagamento/retorno`,
      pending: `${siteUrl.origin}/pagamento/retorno`,
      failure: `${siteUrl.origin}/pagamento/retorno`,
    },
    auto_return: "approved",
    notification_url: webhookUrl.toString(),
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
    },
  };

  const response = await fetch(
    `${MERCADOPAGO_API}/checkout/preferences`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Falha ao criar preferência Mercado Pago: HTTP ${response.status}`
    );
  }

  const data =
    (await response.json()) as MercadoPagoPreference;

  if (!data.id || !data.init_point) {
    throw new Error(
      "O Mercado Pago retornou uma preferência incompleta."
    );
  }

  return data;
}

type ExistingPreference = {
  id?: string;
  init_point?: string;
  external_reference?: string;
  items?: Array<{
    quantity?: number;
    currency_id?: string;
    unit_price?: number;
  }>;
};

type PreferenceSearch = {
  elements?: Array<{ id?: string }>;
};

function preferenceMatches(
  preference: ExistingPreference,
  orderId: string,
  totalAmountCents: number,
): preference is ExistingPreference & {
  id: string;
  init_point: string;
} {
  const item = preference.items?.[0];

  if (
    typeof preference.id !== "string" ||
    typeof preference.init_point !== "string" ||
    preference.external_reference !== orderId ||
    preference.items?.length !== 1 ||
    item?.quantity !== 1 ||
    item.currency_id !== "BRL" ||
    typeof item.unit_price !== "number" ||
    !Number.isSafeInteger(totalAmountCents) ||
    Math.abs(item.unit_price * 100 - totalAmountCents) > 0.000001
  ) {
    return false;
  }

  try {
    const url = new URL(preference.init_point);

    return (
      url.protocol === "https:" &&
      (
        url.hostname === "mercadopago.com.br" ||
        url.hostname.endsWith(".mercadopago.com.br")
      )
    );
  } catch {
    return false;
  }
}

export async function recoverMercadoPagoPreference(
  orderId: string,
  totalAmountCents: number,
  storedPreferenceId?: string | null,
): Promise<{ id: string; checkoutUrl: string } | null> {
  const token =
    process.env.PAYMENT_MODE === "mercadopago_prod"
      ? process.env.MERCADOPAGO_ACCESS_TOKEN_PROD?.trim()
      : process.env.PAYMENT_MODE === "mercadopago_test"
        ? process.env.MERCADOPAGO_ACCESS_TOKEN_TEST?.trim()
        : undefined;

  if (!token) {
    throw new Error("Credencial Mercado Pago ausente.");
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId) ||
    !Number.isSafeInteger(totalAmountCents) ||
    totalAmountCents < 1 ||
    totalAmountCents > 3990
  ) {
    throw new Error("Dados do pedido inválidos.");
  }

  async function getPreference(id: string) {
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) {
      throw new Error("Identificador de preferência inválido.");
    }

    const response = await fetch(
      `${MERCADOPAGO_API}/checkout/preferences/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Consulta da preferência falhou: HTTP ${response.status}`,
      );
    }

    return (await response.json()) as ExistingPreference;
  }

  if (storedPreferenceId) {
    const preference = await getPreference(storedPreferenceId);

    if (!preferenceMatches(preference, orderId, totalAmountCents)) {
      throw new Error(
        "A preferência armazenada não corresponde ao pedido.",
      );
    }

    return {
      id: preference.id,
      checkoutUrl: preference.init_point,
    };
  }

  const searchUrl = new URL(
    `${MERCADOPAGO_API}/checkout/preferences/search`,
  );

  searchUrl.searchParams.set("external_reference", orderId);
  searchUrl.searchParams.set("limit", "100");

  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(
      `Pesquisa de preferências falhou: HTTP ${response.status}`,
    );
  }

  const search = (await response.json()) as PreferenceSearch;

  if (!Array.isArray(search.elements)) {
    throw new Error(
      "Resposta inesperada na pesquisa de preferências.",
    );
  }

  // Se não existe preferência, não inventa um checkout.
  if (search.elements.length === 0) {
    return null;
  }

  // Resultado ambíguo: exige análise antes de prosseguir.
  if (
    search.elements.length !== 1 ||
    typeof search.elements[0]?.id !== "string"
  ) {
    throw new Error(
      "Foram encontradas múltiplas preferências para o pedido.",
    );
  }

  const preference = await getPreference(search.elements[0].id);

  if (!preferenceMatches(preference, orderId, totalAmountCents)) {
    throw new Error(
      "A preferência encontrada não corresponde ao pedido.",
    );
  }

  return {
    id: preference.id,
    checkoutUrl: preference.init_point,
  };
}
