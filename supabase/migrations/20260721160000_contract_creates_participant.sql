-- P6 é o aceite verbal; P7 é o contrato assinado e a entrada na Pré-viagem.
-- Reconciliamos registros já existentes sem apagar nenhum lead ou participante.
UPDATE public.leads_crm AS lead
SET passo = 7, status = 'em_negociacao'
WHERE lead.passo = 6
  AND EXISTS (
    SELECT 1
    FROM public.participants AS participant
    WHERE lower(btrim(coalesce(participant.nome, ''))) = lower(btrim(coalesce(lead.nome, '')))
      AND coalesce(participant.status, '') <> 'removido_comercial'
  );
