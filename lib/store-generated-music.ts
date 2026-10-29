import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createMusicPreview } from "@/lib/music-preview";

type StoreGeneratedMusicInput = {
  orderId: string;
  userId: string;
  taskId: string;
  fullAudio: Buffer;
};

export async function storeGeneratedMusic({
  orderId,
  userId,
  taskId,
  fullAudio,
}: StoreGeneratedMusicInput): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configuração do armazenamento ausente.");
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    !uuidPattern.test(orderId) ||
    !uuidPattern.test(userId) ||
    !taskId.trim()
  ) {
    throw new Error("Identificação da geração inválida.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("state, music_1_storage_path, preview_1_storage_path")
    .eq("id", orderId)
    .eq("user_id", userId)
    .eq("kie_task_id", taskId)
    .maybeSingle();

  if (orderError || !order) {
    throw new Error("Não foi possível confirmar a geração.");
  }

  if (
    order.music_1_storage_path &&
    order.preview_1_storage_path
  ) {
    return true;
  }

  if (
    order.state !== "GERANDO_MUSICA_1" ||
    order.music_1_storage_path ||
    order.preview_1_storage_path
  ) {
    throw new Error("A solicitação exige verificação antes de continuar.");
  }

  const previewAudio = await createMusicPreview(fullAudio);

  const attemptId = randomUUID();
  const directory = `${userId}/${orderId}/${attemptId}`;
  const musicPath = `${directory}/music-1.mp3`;
  const previewPath = `${directory}/preview-1.mp3`;

  const bucket = supabase.storage.from("homenageando-audio");
  let databaseUpdateStarted = false;

  async function removeAttemptFiles() {
    try {
      const { error } = await bucket.remove([musicPath, previewPath]);

      if (error) {
        console.error("Limpeza de arquivos pendente.", {
          orderId,
          attemptId,
        });
      }
    } catch {
      console.error("Limpeza de arquivos pendente.", {
        orderId,
        attemptId,
      });
    }
  }

  try {
    const { error: musicUploadError } = await bucket.upload(
      musicPath,
      fullAudio,
      {
        contentType: "audio/mpeg",
        cacheControl: "0",
        upsert: false,
      },
    );

    if (musicUploadError) {
      throw new Error("Não foi possível armazenar a música.");
    }

    const { error: previewUploadError } = await bucket.upload(
      previewPath,
      previewAudio,
      {
        contentType: "audio/mpeg",
        cacheControl: "0",
        upsert: false,
      },
    );

    if (previewUploadError) {
      throw new Error("Não foi possível armazenar o preview.");
    }

    databaseUpdateStarted = true;

    const { data: savedOrder, error: saveError } = await supabase
      .from("orders")
      .update({
        music_1_storage_path: musicPath,
        preview_1_storage_path: previewPath,
        state: "MUSICA_1_PREVIEW",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("kie_task_id", taskId)
      .eq("state", "GERANDO_MUSICA_1")
      .is("music_1_storage_path", null)
      .is("preview_1_storage_path", null)
      .select("id")
      .maybeSingle();

    if (saveError) {
      throw new Error("Não foi possível confirmar a gravação dos áudios.");
    }

    if (!savedOrder) {
      await removeAttemptFiles();
      return false;
    }

    return true;
  } catch {
    if (!databaseUpdateStarted) {
      await removeAttemptFiles();
    } else {
      // Uma falha de comunicação pode ocorrer depois do commit.
      // Preservar os arquivos evita apagar áudio já vinculado ao pedido.
      console.error("Gravação dos áudios exige reconciliação.", {
        orderId,
        attemptId,
      });
    }

    throw new Error("Não foi possível concluir o armazenamento da música.");
  }
}