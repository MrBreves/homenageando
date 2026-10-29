
import { deletionAdmin, deletionControl, processDeletion } from '../../lib/account-deletion.mjs';

// Um pedido por execução. O SQL alterna a fila e protege contra dupla execução.
const processAccountDeletions = async () => {
  if (process.env.ACCOUNT_DELETION_WORKER_ENABLED !== 'true') return;

  const deadline = Date.now() + 24000;
  const admin = deletionAdmin(deadline);
  const queue = await deletionControl(admin, 'list');

  if (!Array.isArray(queue) || queue.length === 0) return;

  const completed = await processDeletion(admin, queue[0].id, 16000);

  // Não registrar o protocolo público, e-mail, conteúdo ou tokens em logs.
  console.log(
    completed
      ? 'ACCOUNT_DELETION_COMPLETED'
      : 'ACCOUNT_DELETION_RETRY_OR_REVIEW'
  );
};

export default processAccountDeletions;

export const config = { schedule: '* * * * *' };
