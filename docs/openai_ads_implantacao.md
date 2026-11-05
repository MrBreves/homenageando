# OpenAI Ads — implantação da API de Conversões

## Estado
Esta integração está na branch `feat/openai-ads-conversions`. Não aplicar o SQL nem mesclar o PR antes da validação do CI.

## Pré-requisitos
1. A fonte de dados `Homenageando - Site` e a conversão personalizada `purchase_approved` já estão criadas na conta OpenAI Ads.
2. O SQL revisado `db/openai_ads_conversion_outbox.sql` foi aplicado no Supabase em 05/11/2026. Criou duas tabelas no schema privado `homenageando_private`, um trigger de pagamento real e três RPCs de acesso exclusivo ao service_role. **RLS das duas novas tabelas foi sinalizado pelo verificador como desativado; precisa de avaliação e autorização antes de ativar.**
3. No Render (variáveis de ambiente do servidor):
   - `OPENAI_ADS_CONVERSION_API_KEY`: chave secreta criada na OpenAI Ads.
   - `OPENAI_ADS_PIXEL_ID`: ID do Pixel da fonte de dados.
   - `OPENAI_ADS_RETRY_SECRET`: segredo aleatório forte para autenticar reenvios (32 bytes ou mais).
   Não usar prefixo `NEXT_PUBLIC_` nas variáveis secretas.
4. Configurar agendamento para realizar POST em `https://www.homenageando.com.br/api/internal/openai-ads/flush` com cabeçalho `Authorization: Bearer <OPENAI_ADS_RETRY_SECRET>`, periodicamente (por exemplo, a cada 5 minutos). O webhook também agenda um envio não bloqueante após pagamentos reais, mas o agendamento é necessário para reprocessar falhas.

## Escopo
- `oppref` é armazenado temporariamente no navegador **somente após consentimento explícito** e associado a um pedido autenticado ainda pendente.
- Não há Pixel instalado: mensuração da compra é feita pelo servidor.
- Compra de produção confirmada pela RPC atual enfileira uma linha através de trigger. Compras simuladas e cortesias não são enfileiradas.
- O processamento usa o horário real da aprovação e ID estável `mp_purchase_<paymentId>`.
- A fila suporta tentativas e bloqueios de processamento concorrente.
- Falhas externas não alteram nem bloqueiam o pagamento.

## Validação
- `node --test tests/openai-conversions.test.mjs tests/openai-conversions-worker.test.mjs`
- `npx tsc --noEmit`
- `npm run build` com variáveis de ambiente públicas válidas (sem segredos).
- SQL foi testado com `BEGIN; ... ROLLBACK;` e depois aplicado no banco. A migração `openai_ads_conversion_outbox` está registrada.
- Testar a API com `validate_only: true` antes de enviar eventos reais, depois confirmar recepção em OpenAI Ads > Conversões > Fluxo de eventos.
- Conferir o encaminhamento de `oppref` e a atribuição no painel.
- Atualizar o aviso de privacidade para descrever a finalidade e a retenção das referências publicitárias antes da entrada em produção.

## Observação
Nem a credencial nem os dados dos clientes devem ser enviados para testes ou comentários públicos do GitHub.
