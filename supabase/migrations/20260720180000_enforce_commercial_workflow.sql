-- Mantém status e etapa coerentes no funil comercial.
-- "Confirmado" é exclusivo da etapa P7; P3/P4/P5 continuam legados e o front
-- os agrupa na coluna única de Negociação sem apagar o histórico.

UPDATE public.leads_crm
SET status = 'em_negociacao'
WHERE passo <> 7
  AND lower(btrim(coalesce(status, ''))) IN ('confirmado', 'confirmada');

UPDATE public.leads_crm
SET status = 'confirmado'
WHERE passo = 7
  AND lower(btrim(coalesce(status, ''))) NOT IN ('declinado', 'declinada');
