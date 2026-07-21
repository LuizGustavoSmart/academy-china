-- Mantém status e etapa coerentes no funil comercial.
-- "Confirmado" é exclusivo da etapa P7; P3/P4/P5 continuam legados e o front
-- os agrupa na coluna única de Negociação sem apagar o histórico.

-- Confirmado (P7) representa o aceite verbal. Contrato (P6) representa o
-- cadastro efetivo do participante na Pré-viagem, portanto P7 não exige
-- participante e nenhuma confirmação deve ser rebaixada por esse motivo.
UPDATE public.leads_crm
SET status = 'em_negociacao'
WHERE passo <> 7
  AND lower(btrim(coalesce(status, ''))) IN ('confirmado', 'confirmada');

UPDATE public.leads_crm
SET status = 'confirmado'
WHERE passo = 7
  AND lower(btrim(coalesce(status, ''))) NOT IN ('declinado', 'declinada');
