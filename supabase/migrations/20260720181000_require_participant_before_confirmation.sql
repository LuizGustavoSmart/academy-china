-- A confirmação comercial depende da existência do respectivo participante
-- na Pré-viagem. Como o modelo legado não possui uma chave estrangeira entre
-- as tabelas, a conciliação usa o nome normalizado, igual à regra da aplicação.
-- Registros inconsistentes retornam para Contrato (P6), sem perder o lead.
UPDATE public.leads_crm AS lead
SET
  passo = 6,
  status = 'em_negociacao'
WHERE lead.passo = 7
  AND lower(btrim(coalesce(lead.status, ''))) IN ('confirmado', 'confirmada')
  AND NOT EXISTS (
    SELECT 1
    FROM public.participants AS participant
    WHERE lower(btrim(coalesce(participant.nome, ''))) = lower(btrim(coalesce(lead.nome, '')))
  );
