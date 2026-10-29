import { supabase } from "@/lib/supabase";
import type { QuestionnaireAnswers } from "@/types/questionnaire";
import type { OrderState } from "@/types/order-state";

export type Order = {
  id: string;
  user_id: string;
  os_number: number;
  order_number: string | null;
  order_created_at: string | null;
  state: OrderState;
  questionnaire: QuestionnaireAnswers;
  current_step: number;
  created_at: string;
  updated_at: string;
};

export async function getCurrentUserOrder(): Promise<Order | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  const priorityStates: OrderState[] = [
    "AGUARDANDO_PAGAMENTO",
    "GERANDO_MUSICA_1",
    "MUSICA_1_PREVIEW",
    "QUESTIONÁRIO_ABERTO",
  ];

  for (const state of priorityStates) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, user_id, os_number, order_number, order_created_at, state, questionnaire, current_step, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .eq("state", state)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as Order;
    }
  }

  return null;
}

export async function createUserOrder(
  questionnaire: QuestionnaireAnswers,
): Promise<Order & { wasCreated: boolean }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      state: "QUESTIONÁRIO_ABERTO",
      questionnaire,
      current_step: 1,
    })
    .select(
      "id, user_id, os_number, order_number, order_created_at, state, questionnaire, current_step, created_at, updated_at",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      const existingOrder = await getCurrentUserOrder();

      if (existingOrder) {
        return {
          ...existingOrder,
          wasCreated: false,
        };
      }
    }

    throw error;
  }

  return {
    ...(data as Order),
    wasCreated: true,
  };
}

export async function updateUserOrderDraft(
  orderId: string,
  questionnaire: QuestionnaireAnswers,
  currentStep: number,
): Promise<Order> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data, error } = await supabase
    .from("orders")
    .update({
      questionnaire,
      current_step: currentStep,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .eq("state", "QUESTIONÁRIO_ABERTO")
    .select(
      "id, user_id, os_number, order_number, order_created_at, state, questionnaire, current_step, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return data as Order;
}

export async function startMusicGeneration(
  orderId: string,
  questionnaire: QuestionnaireAnswers,
): Promise<Order> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data, error } = await supabase
    .from("orders")
    .update({
      questionnaire,
      state: "GERANDO_MUSICA_1",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .eq("state", "QUESTIONÁRIO_ABERTO")
    .select(
      "id, user_id, os_number, order_number, order_created_at, state, questionnaire, current_step, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return data as Order;
}

export async function getUserOrders(
  page: number = 1,
): Promise<Order[]> {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Página inválida.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const pageSize = 20;
  const firstItem = (page - 1) * pageSize;
  const lastItem = firstItem + pageSize - 1;

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, user_id, os_number, order_number, order_created_at, state, questionnaire, current_step, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(firstItem, lastItem);

  if (error) {
    throw error;
  }

  return (data ?? []) as Order[];
}