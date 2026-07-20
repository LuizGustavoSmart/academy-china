-- Mantém status e etapa coerentes no funil comercial.
-- "Confirmado" é exclusivo da etapa P7; P3/P4/P5 continuam legados e o front
-- os agrupa na coluna única de Negociação sem apagar o histórico.

-- Uma confirmação histórica em P6 com participante correspondente é uma
-- confirmação válida: ela é promovida para a etapa correta em vez de perder
-- o vínculo com a Pré-viagem.
UPDATE public.leads_crm AS lead
SET passo = 7, status = 'confirmado'
WHERE lead.passo <> 7
  AND lower(btrim(coalesce(lead.status, ''))) IN ('confirmado', 'confirmada')
  AND EXISTS (
    SELECT 1 FROM public.participants AS participant
    WHERE lower(btrim(coalesce(participant.nome, ''))) = lower(btrim(coalesce(lead.nome, '')))
      AND coalesce(participant.status, '') <> 'removido_comercial'
  );

-- Sem participante correspondente, Confirmado não é válido e volta para
-- negociação até a criação do cadastro da Pré-viagem.
UPDATE public.leads_crm
SET status = 'em_negociacao'
WHERE passo <> 7
  AND lower(btrim(coalesce(status, ''))) IN ('confirmado', 'confirmada');

UPDATE public.leads_crm
SET status = 'confirmado'
WHERE passo = 7
  AND lower(btrim(coalesce(status, ''))) NOT IN ('declinado', 'declinada');
