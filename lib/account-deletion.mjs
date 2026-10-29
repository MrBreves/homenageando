
 // Somente servidor. Não importar em componentes 'use client'.
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

/** @param {number} [deadline] */
export function deletionAdmin(deadline = Infinity) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Configuração do servidor ausente.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        signal: init?.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(Math.max(1, Math.min(8000, deadline - Date.now())))])
          : AbortSignal.timeout(Math.max(1, Math.min(8000, deadline - Date.now()))),
      }),
    },
  });
}

/** @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} action
 * @param {Record<string, unknown>} [params]
 */
export async function deletionControl(admin, action, params = {}) {
  const { data, error } = await admin.rpc('account_deletion_control', {
    p_action: action, ...params,
  });
  if (error) throw new Error(
    ['STORAGE_SCOPE_REVIEW', 'COMMERCIAL_SNAPSHOT_MISMATCH', 'PAYMENT_RECONCILIATION'].find(code => error.message.includes(code)) ?? 'DATABASE_ERROR',
  );
  return data;
}

/** @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} requestId
 * @param {number} [budgetMs]
 */
export async function processDeletion(admin, requestId, budgetMs = 20000) {
  const token = randomUUID();
  const params = { p_request_id: requestId, p_token: token };
  const deadline = Date.now() + budgetMs;
  const claim = await deletionControl(admin, 'claim', params);
  if (claim.completed) return true;
  if (!claim.claimed) return false;
  const userId = claim.user_id;
  let errorCode = 'TIME_BUDGET';
  try {
    if (userId) {
      while (true) {
        if (Date.now() >= deadline) return false;
        const batch = await deletionControl(admin, 'files', params);
        if (!Array.isArray(batch.paths)) throw new Error('DATABASE_ERROR');
        if (batch.paths.length === 0) break;
        // Defesa adicional: prefixo EXATO do usuário, bucket privado fixo.
        if (batch.paths.some(/** @param {unknown} path */ path => typeof path !== 'string' || !path.startsWith(userId + '/'))) {
          throw new Error('STORAGE_SCOPE_REVIEW');
        }
        const { error } = await admin.storage.from('homenageando-audio').remove(batch.paths);
        if (error) throw new Error('STORAGE_ERROR');
        // Volta à primeira página: não usa offset em coleção que está diminuindo.
      }
      if (Date.now() >= deadline) return false;
      await deletionControl(admin, 'prepare_auth', params);
      const { error } = await admin.auth.admin.deleteUser(userId, false);
      if (error && error.code !== 'user_not_found') throw new Error('AUTH_ERROR');
    }
    // user_id nulo também recupera queda ocorrida depois do deleteUser.
    await deletionControl(admin, 'complete', params);
    return true;
  } catch (error) {
    errorCode = error instanceof Error ? error.message : 'PROCESSING_ERROR';
    return false;
  } finally {
    // Não substitui o resultado principal por erro de comunicação no release.
    try { await deletionControl(admin, 'release', { ...params, p_error: errorCode }); }
    catch { /* A posse vence em 5 minutos; o processador retoma sem perder a solicitação. */ }
  }
}

/** @template {Request} T
 * @param {T} request
 * @param {(request: T) => Promise<Response>} handler
 */
export async function withAccountOperation(request, handler) {
  /** @param {string} error @param {number} status */
  const json = (error, status) => Response.json({ error }, {
    status, headers: { 'Cache-Control': 'no-store' },
  });
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json('Usuário não autenticado.', 401);
  const admin = deletionAdmin();
  const { data, error } = await admin.auth.getUser(authorization.slice(7));
  if (error || !data.user) return json('Sessão inválida.', 401);
  const operationId = randomUUID();
  const params = { p_user_id: data.user.id, p_operation_id: operationId };
  let entered = false;
  try {
    const result = await deletionControl(admin, 'begin', params);
    if (!result.allowed) return json('Sua conta está em processo de exclusão.', 409);
    entered = true;
    return await handler(request);
  } catch {
    return json('Não foi possível concluir a operação agora.', 503);
  } finally {
    if (entered) {
      try {
        // Só remove a operação depois que TODO o handler terminou, inclusive uploads.
        const result = await deletionControl(admin, 'end', params);
        if (result.request_id) await processDeletion(admin, result.request_id, 10000);
      } catch {
        // Nunca expira operação automaticamente: o servidor ainda pode estar escrevendo.
        console.error('ACCOUNT_OPERATION_RECOVERY_REQUIRED', operationId);
      }
    }
  }
}
