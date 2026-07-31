// Recebe a ficha enviada em china.matteracademy.ai/formulario (outro projeto Supabase) e
// tenta vincular a um participante já confirmado no comercial (match por e-mail/telefone),
// enriquecendo seus dados e marcando `form_synced_at` — o que avança o card dele para
// "Formulário preenchido" no board de Pré-viagem. Se não achar correspondência, cria um
// participante mesmo assim (pra não perder a resposta) e abre uma pendência sinalizando
// que o vínculo com o comercial precisa ser revisado manualmente.
// Roda como Edge Function no próprio projeto do CRM para poder usar a service_role key
// injetada automaticamente pelo runtime (SUPABASE_SERVICE_ROLE_KEY) — assim nenhuma chave
// privilegiada precisa ser copiada para fora do Lovable Cloud. Autenticação simples por
// chave compartilhada (mesmo padrão do x-admin-key usado no app do formulário), já que quem
// chama é o server do outro app, não um usuário logado — por isso verify_jwt = false em
// supabase/config.toml para esta função.
import { createClient } from "jsr:@supabase/supabase-js@2";

// Troque essa chave e a correspondente no app do formulário (src/lib/sync-to-crm.functions.ts)
// se precisar rotacionar o acesso.
const SYNC_KEY = "ChinaSync-Matter2026";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
};

/** Últimos 8 dígitos — tolera diferença de DDI/formatação (+55, espaços, traços, parênteses). */
const phoneKey = (v: string | null): string | null => {
  if (!v) return null;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-8) : null;
};

const PHOTOS_BUCKET = "participant-photos";

// A migração cria o bucket via INSERT direto em storage.buckets, mas a role que aplica
// migrations no Lovable Cloud nem sempre tem permissão pra isso ("Bucket not found" mesmo
// com a migração aplicada). Criar aqui, com a service_role key, passa pela API de Storage de
// verdade — que tem a permissão certa — e é idempotente (ignora o erro de "já existe").
async function ensureBucket(admin: ReturnType<typeof createClient>) {
  // Workspace bloqueia buckets públicos — mantemos privado e servimos por signed URL.
  const { error } = await admin.storage.createBucket(PHOTOS_BUCKET, { public: false });
  if (error && !/already exists/i.test(error.message)) {
    console.error("[sync-participant-form] falha ao garantir bucket", error);
  }
}

async function uploadFoto(admin: ReturnType<typeof createClient>, passaporte: string, fotoDataUrl: string | null | undefined) {
  if (!fotoDataUrl) return null;
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(fotoDataUrl);
  if (!match) return null;
  const [, mime, base64] = match;
  const ext = mime.split("/")[1] === "jpeg" ? "jpg" : mime.split("/")[1];
  const path = `${passaporte}.${ext}`;
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  await ensureBucket(admin);
  const { error } = await admin.storage.from(PHOTOS_BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: true,
  });
  if (error) {
    console.error("[sync-participant-form] falha ao subir foto", error);
    return null;
  }
  // ~10 anos — bucket é privado, então precisamos de signed URL pra exibir a foto no CRM.
  const { data: signed, error: signErr } = await admin.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signErr) {
    console.error("[sync-participant-form] falha ao assinar url da foto", signErr);
    return null;
  }
  return signed.signedUrl;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (req.headers.get("x-sync-key") !== SYNC_KEY) return json({ error: "unauthorized" }, 401);

  let body: { form_id?: string; payload?: Record<string, unknown>; foto_data_url?: string | null };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const payload = body.payload;
  if (!payload) return json({ error: "missing_payload" }, 400);

  const passaporte = str(payload.passaporteNumero);
  const nome = [str(payload.primeiroNome), str(payload.sobrenome)].filter(Boolean).join(" ").trim();
  if (!passaporte || !nome) return json({ error: "missing_required_fields" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const emergencia = [
    str(payload.emgNome),
    str(payload.emgParentesco) ? `(${str(payload.emgParentesco)})` : null,
    str(payload.emgTelefone),
    str(payload.emgEmail),
  ]
    .filter(Boolean)
    .join(" · ") || null;

  // "Nenhuma" grava a resposta explícita "não tenho" — null continua reservado para quem ainda
  // não respondeu essa etapa. Sem essa distinção, os dois casos ficam indistinguíveis no CRM.
  const alergiaAlimentar =
    payload.alergiaAlimentar === "sim"
      ? str(payload.alergiaAlimentarDetalhe) ?? "Sim"
      : payload.alergiaAlimentar === "nao"
        ? "Nenhuma"
        : null;
  const alergiaMedicamento =
    payload.alergiaMedicamento === "sim"
      ? str(payload.alergiaMedicamentoDetalhe) ?? "Sim"
      : payload.alergiaMedicamento === "nao"
        ? "Nenhuma"
        : null;

  // Guarda mesmo quando a resposta é "não comprou ainda" — senão o painel de voo simplesmente
  // não aparece pra quem respondeu isso, dando a impressão de que a etapa não foi respondida.
  const vooDetalhes = payload.passagemComprada
    ? {
        comprada: str(payload.passagemComprada),
        ...(payload.passagemComprada === "sim"
          ? {
              empresa_compra: str(payload.vooEmpresaCompra),
              cia: str(payload.vooCia),
              numero: str(payload.vooNumero),
              classe: str(payload.vooClasse),
              origem: str(payload.vooOrigem),
              conexoes: str(payload.vooConexoes),
              destino: str(payload.vooDestino),
              data_embarque: str(payload.vooDataEmbarque),
              partida: str(payload.vooPartida),
              chegada: str(payload.vooChegada),
              terminal: str(payload.vooTerminal),
            }
          : {}),
      }
    : null;

  // Mesma lógica do voo de ida, para o trecho de volta respondido no formulário.
  const vooVoltaDetalhes = payload.passagemComprada
    ? {
        comprada: str(payload.passagemComprada),
        ...(payload.passagemComprada === "sim"
          ? {
              cia: str(payload.vooVoltaCia),
              numero: str(payload.vooVoltaNumero),
              classe: str(payload.vooVoltaClasse),
              origem: str(payload.vooVoltaOrigem),
              conexoes: str(payload.vooVoltaConexoes),
              destino: str(payload.vooVoltaDestino),
              data_embarque: str(payload.vooVoltaDataEmbarque),
              partida: str(payload.vooVoltaPartida),
              chegada: str(payload.vooVoltaChegada),
              terminal: str(payload.vooVoltaTerminal),
            }
          : {}),
      }
    : null;

  const foto_url = await uploadFoto(admin, passaporte, body.foto_data_url);

  // ────────── identifica o participante confirmado correspondente ──────────
  // Só por e-mail (exato, case-insensitive) e telefone (últimos 8 dígitos) — nunca por
  // passaporte (o participante criado a partir da confirmação no comercial normalmente
  // ainda não tem passaporte cadastrado) nem por nome (risco de nomes duplicados/parecidos).
  const email = str(payload.email);
  const telefone = str(payload.telefone);
  const telKey = phoneKey(telefone);
  let existingId: string | null = null;

  if (email) {
    const { data, error } = await admin.from("participants").select("id").ilike("email", email).limit(1).maybeSingle();
    if (error) {
      console.error("[sync-participant-form] falha ao buscar por email", error);
      return json({ error: "db_error" }, 500);
    }
    if (data) existingId = data.id;
  }
  if (!existingId && telKey) {
    const { data, error } = await admin.from("participants").select("id, telefone").not("telefone", "is", null);
    if (error) {
      console.error("[sync-participant-form] falha ao buscar por telefone", error);
      return json({ error: "db_error" }, 500);
    }
    const match = (data ?? []).find((p) => phoneKey(p.telefone as string | null) === telKey);
    if (match) existingId = match.id as string;
  }

  const fields: Record<string, unknown> = {
    nome,
    nome_completo: nome,
    email,
    telefone,
    cargo: str(payload.cargo),
    empresa: str(payload.empresaNome),
    empresa_perfil: str(payload.empresaPerfil),
    areas_interesse: str(payload.areasInteresse),
    empresa_site: str(payload.empresaSite),
    passaporte,
    passaporte_emissao: str(payload.passaporteEmissao),
    passaporte_validade: str(payload.passaporteValidade),
    data_nascimento: str(payload.dataNascimento),
    nacionalidade: str(payload.nacionalidade),
    tipo_sanguineo: str(payload.tipoSanguineo),
    tamanho_camisa: str(payload.tamanhoCamisa),
    tamanho_blazer: str(payload.tamanhoBlazer),
    contato_emergencia: emergencia,
    restricoes_alimentares: alergiaAlimentar,
    alergias: alergiaMedicamento,
    voo_detalhes: vooDetalhes,
    voo_volta_detalhes: vooVoltaDetalhes,
    form_id: body.form_id ?? null,
    form_synced_at: new Date().toISOString(),
    ...(foto_url ? { foto_url } : {}),
  };

  if (existingId) {
    const { error } = await admin.from("participants").update(fields).eq("id", existingId);
    if (error) {
      console.error("[sync-participant-form] falha ao atualizar participante", error);
      return json({ error: "db_error" }, 500);
    }
    return json({ ok: true, id: existingId, action: "updated" });
  }

  // Nenhum participante confirmado bateu por e-mail/telefone — cria mesmo assim, para não
  // perder a resposta do formulário, mas sinaliza claramente que o vínculo com o comercial
  // não pôde ser confirmado automaticamente, para revisão manual da equipe.
  const { data: created, error } = await admin
    .from("participants")
    .insert({
      ...fields,
      origem: "formulario",
      status: "ativo",
      pagamento_status: "pendente",
      contrato_status: "pendente",
      seguro_status: "pendente",
      uso_imagem_status: "pendente",
      voo_ida_status: "nao_iniciado",
      voo_volta_status: "nao_iniciado",
      tier: "standard",
      valor_pago: 0,
      observacoes: "⚠️ Criado via formulário sem correspondência com participante confirmado no comercial (e-mail/telefone não bateram) — revisar vínculo.",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[sync-participant-form] falha ao criar participante", error);
    return json({ error: "db_error" }, 500);
  }

  const { error: pendErr } = await admin.from("pendencias").insert({
    titulo: `Formulário sem participante confirmado — ${nome}`,
    descricao: `O formulário público foi preenchido, mas nenhum participante confirmado no comercial bateu por e-mail (${email ?? "—"}) ou telefone (${telefone ?? "—"}). Um novo participante foi criado automaticamente para não perder os dados — revise se ele já tinha um lead confirmado e corrija o vínculo se necessário.`,
    fase: "comercial",
    prioridade: "alta",
    status: "aberta",
    ordem: 0,
  });
  if (pendErr) console.error("[sync-participant-form] falha ao criar pendência de revisão", pendErr);

  return json({ ok: true, id: created.id, action: "created_needs_review" });
});
