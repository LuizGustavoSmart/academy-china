-- Participante passa a existir em Contrato (P7). Confirmação (P6) é o aceite
-- comercial e pode existir sem contrato. Os registros históricos que já têm
-- participante são conciliados para P7, preservando todos os dados.
UPDATE public.leads_crm AS lead
SET
  passo = 7,
  status = 'em_negociacao'
WHERE lead.passo = 6
  AND EXISTS (
    SELECT 1
    FROM public.participants AS participant
    WHERE lower(btrim(coalesce(participant.nome, ''))) = lower(btrim(coalesce(lead.nome, '')))
  );
