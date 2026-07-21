-- Participante passa a existir em Contrato (P6). Confirmação (P7) é o aceite
-- comercial e pode existir sem contrato. Os registros históricos que já têm
-- participante são conciliados para P6, preservando todos os dados.
UPDATE public.leads_crm AS lead
SET
  passo = 6,
  status = 'em_negociacao'
WHERE lead.passo = 7
  AND EXISTS (
    SELECT 1
    FROM public.participants AS participant
    WHERE lower(btrim(coalesce(participant.nome, ''))) = lower(btrim(coalesce(lead.nome, '')))
  );
