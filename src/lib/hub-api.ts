import { hubSupabase } from "@/integrations/supabase/hub-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ────────── TYPES ──────────
export type Participant = {
  id: string;
  nome: string;
  nome_completo: string | null;
  cargo: string | null;
  empresa: string | null;
  cidade: string | null;
  email: string | null;
  telefone: string | null;
  passaporte: string | null;
  data_nascimento: string | null;
  contato_emergencia: string | null;
  restricoes_alimentares: string | null;
  alergias: string | null;
  observacoes_medicas: string | null;
  medicamentos: string | null;
  quarto: string | null;
  tier: string;
  valor_pago: number;
  parcelas: number;
  pagamento_status: string;
  contrato_status: string;
  seguro_status: string;
  voo_ida_status: string;
  voo_volta_status: string;
  uso_imagem_status: string;
  origem: string | null;
  observacoes: string | null;
  status: string;
  created_at: string;
  // ─── vindos do formulário público (china.matteracademy.ai/formulario) ───
  foto_url: string | null;
  nacionalidade: string | null;
  tipo_sanguineo: string | null;
  tamanho_camisa: string | null;
  tamanho_blazer: string | null;
  passaporte_emissao: string | null;
  passaporte_validade: string | null;
  empresa_perfil: string | null;
  areas_interesse: string | null;
  empresa_site: string | null;
  voo_detalhes: Record<string, unknown> | null;
  voo_volta_detalhes: Record<string, unknown> | null;
  form_id: string | null;
  form_synced_at: string | null;
};

export type Lead = {
  id: string;
  nome: string;
  cargo: string | null;
  empresa: string | null;
  cidade: string | null;
  passo: number;
  responsavel: string;
  status: string | null;
  observacoes: string | null;
  ordem: number;
  created_at: string;
  email: string | null;
  telefone: string | null;
  mensagem: string | null;
  origem: string | null;
  cadastrado_por: string | null;
  // Vínculo N:N carregado junto do lead (via lead_responsaveis). A coluna texto
  // `responsavel` acima é legada e preservada só para compatibilidade.
  responsaveis?: Responsavel[];
};

export type Responsavel = {
  id: string;
  nome: string;
  cor: string | null;
  ativo: boolean;
  created_at?: string;
};

export type LeadActivity = {
  id: string;
  lead_id: string;
  conteudo: string;
  autor: string | null;
  tipo: string;
  created_at: string;
};

export type Touchpoint = {
  id: string;
  participant_id: string;
  touchpoint_code: string;
  status: string;
};

export type Pendencia = {
  id: string;
  titulo: string;
  descricao: string | null;
  fase: string;
  dono: string | null;
  prioridade: string;
  impacto: string | null;
  status: string;
  ordem: number;
  created_at: string;
  data_inicio: string | null;
  data_fim: string | null;
};

export type FinanceiroConfig = {
  id: number;
  cambio: number;
  tier_standard: number;
  tier_premium: number;
  meta_vagas: number;
  min_vagas: number;
};

export type Custo = {
  id: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  valor_fixo: number;
  valor_variavel: number;
  data_vencimento: string | null;
  ordem: number;
  created_at: string;
};

export type Mensagem = {
  id: string;
  etapa: string;
  codigo: string;
  titulo: string;
  meta: string | null;
  nota: string | null;
  nota_tipo: string;
  corpo: string | null;
  ordem: number;
};

const sb = hubSupabase as any;

// O front continua utilizável enquanto a migration comercial não foi aplicada no
// ambiente remoto. Os IDs abaixo existem apenas no cliente e representam a coluna
// texto legada `leads_crm.responsavel`.
const LEGACY_RESPONSAVEIS: Responsavel[] = [
  { id: "legacy-caetano", nome: "Caetano", cor: null, ativo: true },
  { id: "legacy-roque", nome: "Roque", cor: null, ativo: true },
];
const legacyResponsavelFromName = (name: string): Responsavel => {
  const clean = name.trim();
  const known = LEGACY_RESPONSAVEIS.find((responsavel) => responsavel.nome.toLowerCase() === clean.toLowerCase());
  return known ?? { id: `legacy-name:${encodeURIComponent(clean)}`, nome: clean, cor: null, ativo: true };
};

export type ParticipantActivity = {
  id: string;
  participant_id: string;
  conteudo: string;
  autor: string | null;
  tipo: string;
  created_at: string;
};
const legacyNameFromId = (id: string): string | null => {
  const known = LEGACY_RESPONSAVEIS.find((responsavel) => responsavel.id === id);
  if (known) return known.nome;
  if (!id.startsWith("legacy-name:")) return null;
  try { return decodeURIComponent(id.slice("legacy-name:".length)); } catch { return null; }
};
const isMissingCommercialTable = (error: any) =>
  error?.code === "PGRST205" || error?.code === "42P01" || /schema cache|does not exist/i.test(error?.message ?? "");
const responsaveisFromLegacy = (value: string | null | undefined): Responsavel[] => {
  const clean = (value ?? "").trim();
  const normalized = clean.toLowerCase();
  if (!clean || normalized === "sem_responsavel") return [];
  if (normalized === "ambos") return LEGACY_RESPONSAVEIS;
  return clean.split(/\s*\+\s*/).filter(Boolean).map(legacyResponsavelFromName);
};
const legacyValueFromIds = (ids: string[]) => {
  const names = ids.map(legacyNameFromId).filter(Boolean) as string[];
  const normalized = names.map((name) => name.toLowerCase());
  if (names.length === 2 && normalized.includes("caetano") && normalized.includes("roque")) return "ambos";
  return names.join(" + ") || "sem_responsavel";
};

// ────────── PARTICIPANTS ──────────
export function useParticipants() {
  return useQuery<Participant[]>({
    queryKey: ["hub_participants"],
    queryFn: async () => {
      const { data, error } = await sb.from("participants").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((participant: Participant) => participant.status !== "removido_comercial");
    },
  });
}

export function useParticipant(id: string | null) {
  return useQuery<Participant | null>({
    queryKey: ["hub_participant", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await sb.from("participants").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Participant>) => {
      const { data, error } = await sb.from("participants").insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_participants"] }),
  });
}

export function useUpdateParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Participant> }) => {
      const { error } = await sb.from("participants").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d: any, v: any) => {
      qc.invalidateQueries({ queryKey: ["hub_participants"] });
      qc.invalidateQueries({ queryKey: ["hub_participant", v.id] });
    },
  });
}

export function useDeleteParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("participants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_participants"] }),
  });
}

// ────────── LEADS ──────────
export function useLeads() {
  return useQuery<Lead[]>({
    queryKey: ["hub_leads"],
    queryFn: async () => {
      // Tenta trazer os responsáveis vinculados no mesmo request (embed via FK).
      const embed = await sb
        .from("leads_crm")
        .select("*, lead_responsaveis(responsavel_id, responsaveis(id, nome, cor, ativo))")
        .order("passo")
        .order("ordem");
      if (!embed.error) {
        return (embed.data ?? []).map((l: any) => ({
          ...l,
          responsaveis: (l.lead_responsaveis ?? [])
            .map((lr: any) => lr.responsaveis)
            .filter(Boolean),
          lead_responsaveis: undefined,
        })).map(normalizeLeadForView);
      }
      // Fallback: se a migração ainda não rodou, projeta a coluna texto antiga como tags.
      const { data, error } = await sb.from("leads_crm").select("*").order("passo").order("ordem");
      if (error) throw error;
      return (data ?? []).map((l: any) => normalizeLeadForView({ ...l, responsaveis: responsaveisFromLegacy(l.responsavel) }));
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (l: Partial<Lead>) => {
      const safeLead = enforceLeadWorkflowState(l);
      const { data, error } = await sb.from("leads_crm").insert(safeLead).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_leads"] }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Lead> }) => {
      let safePatch = patch;
      if (patch.passo !== undefined || patch.status !== undefined) {
        const { data: current, error: currentError } = await sb.from("leads_crm").select("passo,status,nome").eq("id", id).single();
        if (currentError) throw currentError;
        safePatch = enforceLeadWorkflowState(patch, current);
        const nextPasso = safePatch.passo ?? current.passo;
        const wasContracted = current.passo === STAGE_CONTRATO && normalizeStatus(current.status) !== "declinado";
        const willBeContracted = nextPasso === STAGE_CONTRATO && normalizeStatus(safePatch.status ?? current.status) !== "declinado";
        if (wasContracted && !willBeContracted) {
          const { error: removeError } = await sb.from("participants")
            .update({ status: "removido_comercial", updated_at: new Date().toISOString() })
            .eq("nome", current.nome);
          if (removeError) throw removeError;
        }
        if (!wasContracted && willBeContracted) {
          const { error: reactivateError } = await sb.from("participants")
            .update({ status: "em_andamento", updated_at: new Date().toISOString() })
            .eq("nome", current.nome)
            .eq("status", "removido_comercial");
          if (reactivateError) throw reactivateError;
        }
      }
      const { error } = await sb.from("leads_crm").update({ ...safePatch, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_leads"] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("leads_crm").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_leads"] }),
  });
}

// ────────── RESPONSÁVEIS ──────────
export function useResponsaveis() {
  return useQuery<Responsavel[]>({
    queryKey: ["hub_responsaveis"],
    queryFn: async () => {
      const { data, error } = await sb.from("responsaveis").select("*").order("nome");
      if (error && isMissingCommercialTable(error)) {
        const { data: leads, error: leadsError } = await sb.from("leads_crm").select("responsavel");
        if (leadsError) throw leadsError;
        const all = [...LEGACY_RESPONSAVEIS, ...(leads ?? []).flatMap((lead: any) => responsaveisFromLegacy(lead.responsavel))];
        return [...new Map(all.map((responsavel) => [responsavel.nome.toLowerCase(), responsavel])).values()]
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      }
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateResponsavel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const clean = nome.trim();
      if (!clean) throw new Error("Nome vazio");
      // Reaproveita um responsável de mesmo nome (case-insensitive) em vez de duplicar.
      const { data: existing, error: findError } = await sb.from("responsaveis").select("*").ilike("nome", clean).maybeSingle();
      if (findError && isMissingCommercialTable(findError)) return legacyResponsavelFromName(clean);
      if (findError) throw findError;
      if (existing) return existing as Responsavel;
      const { data, error } = await sb.from("responsaveis").insert({ nome: clean }).select().single();
      if (error && isMissingCommercialTable(error)) return legacyResponsavelFromName(clean);
      if (error) throw error;
      return data as Responsavel;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_responsaveis"] }),
  });
}

export function useUpdateResponsavel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Responsavel, "nome" | "cor" | "ativo">> }) => {
      if (id.startsWith("legacy-")) throw new Error("Responsável legado não pode ser editado.");
      const clean = { ...patch, ...(patch.nome !== undefined ? { nome: patch.nome.trim() } : {}) };
      const { data, error } = await sb.from("responsaveis").update(clean).eq("id", id).select().single();
      if (error) throw error;
      return data as Responsavel;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hub_responsaveis"] });
      qc.invalidateQueries({ queryKey: ["hub_leads"] });
    },
  });
}

export function useDeleteResponsavel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith("legacy-")) throw new Error("Responsável legado não pode ser excluído.");
      // Remove vínculos antes para evitar erro de FK caso não haja cascade.
      await sb.from("lead_responsaveis").delete().eq("responsavel_id", id);
      const { error } = await sb.from("responsaveis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hub_responsaveis"] });
      qc.invalidateQueries({ queryKey: ["hub_leads"] });
    },
  });
}

/** Substitui o conjunto de responsáveis de um lead pelo array informado. */
export function useSetLeadResponsaveis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, responsavelIds }: { leadId: string; responsavelIds: string[] }) => {
      const saveLegacy = async () => {
        const { error } = await sb.from("leads_crm").update({ responsavel: legacyValueFromIds(responsavelIds) }).eq("id", leadId);
        if (error) throw error;
      };
      if (responsavelIds.some((id) => id.startsWith("legacy-"))) {
        await saveLegacy();
        return;
      }
      // A troca inteira acontece no banco em uma única transação. Antes, o
      // cliente apagava os vínculos e só então inseria os novos: uma falha no
      // meio do processo fazia a tela parecer salva, mas o lead ficava sem os
      // responsáveis (ou voltava ao estado anterior ao recarregar).
      const { error: replaceError } = await sb.rpc("replace_lead_responsaveis", {
        p_lead_id: leadId,
        p_responsavel_ids: [...new Set(responsavelIds)],
      });
      if (!replaceError) return;
      if (!isMissingCommercialTable(replaceError) && replaceError?.code !== "PGRST202") throw replaceError;

      // Compatibilidade temporária para ambientes nos quais a migration da
      // função ainda não chegou. O caminho abaixo preserva o comportamento
      // anterior, mas os ambientes atualizados sempre usam a operação atômica.
      const { error: delErr } = await sb.from("lead_responsaveis").delete().eq("lead_id", leadId);
      if (delErr && isMissingCommercialTable(delErr)) {
        await saveLegacy();
        return;
      }
      if (delErr) throw delErr;
      if (responsavelIds.length) {
        const rows = responsavelIds.map((responsavel_id) => ({ lead_id: leadId, responsavel_id }));
        const { error } = await sb.from("lead_responsaveis").insert(rows);
        if (error) throw error;
      }
      const legacyValue = responsavelIds.length
        ? await (async () => {
            const { data, error } = await sb.from("responsaveis").select("nome").in("id", responsavelIds);
            if (error) throw error;
            return (data ?? []).map((responsavel: any) => responsavel.nome).join(" + ") || "sem_responsavel";
          })()
        : "sem_responsavel";
      // Mantém a coluna antiga coerente para integrações que ainda a consomem.
      const { error: legacyError } = await sb.from("leads_crm").update({ responsavel: legacyValue }).eq("id", leadId);
      if (legacyError) throw legacyError;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["hub_leads"] }),
        qc.invalidateQueries({ queryKey: ["hub_responsaveis"] }),
      ]);
    },
  });
}

// ────────── LEAD ACTIVITIES (timeline) ──────────
export function useLeadActivities(leadId: string | null) {
  return useQuery<LeadActivity[]>({
    queryKey: ["hub_lead_activities", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await sb
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error && isMissingCommercialTable(error)) return [];
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { lead_id: string; conteudo: string; autor?: string | null; tipo?: string }) => {
      const { data, error } = await sb.from("lead_activities").insert(a).select().single();
      if (error && isMissingCommercialTable(error)) return null;
      if (error) throw error;
      // Espelha cada nova atividade para os participantes do mesmo contato.
      // A falha no espelho não pode desfazer a nota já gravada no Comercial.
      await mirrorLeadActivityToParticipants(a.lead_id, data as LeadActivity);
      return data as LeadActivity;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["hub_lead_activities", v.lead_id] }),
  });
}

export function useUpdateLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { id: string; lead_id: string; conteudo: string }) => {
      const { error } = await sb.from("lead_activities").update({ conteudo: a.conteudo }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["hub_lead_activities", v.lead_id] }),
  });
}

export function useDeleteLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { id: string; lead_id: string }) => {
      const { error } = await sb.from("lead_activities").delete().eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["hub_lead_activities", v.lead_id] }),
  });
}

// ────────── TOUCHPOINTS ──────────
export function useTouchpoints() {
  return useQuery<Touchpoint[]>({
    queryKey: ["hub_touchpoints"],
    queryFn: async () => {
      const { data, error } = await sb.from("touchpoints").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertTouchpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: { participant_id: string; touchpoint_code: string; status: string }) => {
      const { error } = await sb
        .from("touchpoints")
        .upsert({ ...t, updated_at: new Date().toISOString() }, { onConflict: "participant_id,touchpoint_code" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_touchpoints"] }),
  });
}

// Batch upsert com update otimista — usado pelo kanban de pré-viagem (mover card = várias etapas de uma vez)
export function useUpsertTouchpoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ts: { participant_id: string; touchpoint_code: string; status: string }[]) => {
      const now = new Date().toISOString();
      const { error } = await sb
        .from("touchpoints")
        .upsert(ts.map((t) => ({ ...t, updated_at: now })), { onConflict: "participant_id,touchpoint_code" });
      if (error) throw error;
    },
    onMutate: async (ts) => {
      await qc.cancelQueries({ queryKey: ["hub_touchpoints"] });
      const prev = qc.getQueryData<Touchpoint[]>(["hub_touchpoints"]);
      qc.setQueryData<Touchpoint[]>(["hub_touchpoints"], (old = []) => {
        const next = [...old];
        for (const t of ts) {
          const i = next.findIndex((x) => x.participant_id === t.participant_id && x.touchpoint_code === t.touchpoint_code);
          if (i >= 0) next[i] = { ...next[i], status: t.status };
          else next.push({ id: `tmp-${t.participant_id}-${t.touchpoint_code}`, ...t } as Touchpoint);
        }
        return next;
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["hub_touchpoints"], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["hub_touchpoints"] }),
  });
}

// ────────── PENDENCIAS ──────────
export function usePendencias() {
  return useQuery<Pendencia[]>({
    queryKey: ["hub_pendencias"],
    queryFn: async () => {
      const { data, error } = await sb.from("pendencias").select("*").order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePendencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Pendencia>) => {
      const { data, error } = await sb.from("pendencias").insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_pendencias"] }),
  });
}

export function useUpdatePendencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pendencia> }) => {
      const { error } = await sb.from("pendencias").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_pendencias"] }),
  });
}

export function useDeletePendencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("pendencias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_pendencias"] }),
  });
}

// ────────── FINANCEIRO ──────────
export function useFinanceiroConfig() {
  return useQuery<FinanceiroConfig | null>({
    queryKey: ["hub_financeiro_config"],
    queryFn: async () => {
      const { data, error } = await sb.from("financeiro_config").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateFinanceiroConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<FinanceiroConfig>) => {
      const { error } = await sb
        .from("financeiro_config")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_financeiro_config"] }),
  });
}

// ────────── CUSTOS ──────────
export function useCustos() {
  return useQuery<Custo[]>({
    queryKey: ["hub_custos"],
    queryFn: async () => {
      const { data, error } = await sb.from("custos").select("*").order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCusto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<Custo>) => {
      const { data, error } = await sb.from("custos").insert(c).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_custos"] }),
  });
}

export function useUpdateCusto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Custo> }) => {
      const { error } = await sb.from("custos").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_custos"] }),
  });
}

export function useDeleteCusto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("custos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_custos"] }),
  });
}

export const CATEGORIAS_CUSTO: { value: string; label: string }[] = [
  { value: "parceiro", label: "Parceiro local" },
  { value: "hoteis", label: "Hotéis" },
  { value: "transporte", label: "Transporte interno" },
  { value: "jantares", label: "Jantares" },
  { value: "videomaker", label: "Videomaker + produção" },
  { value: "interpretes", label: "Intérpretes + operações locais" },
  { value: "outro", label: "Outro" },
];

export const categoriaLabel = (v: string) =>
  CATEGORIAS_CUSTO.find((c) => c.value === v)?.label ?? v;

export const custoValor = (c: Custo) => {
  if (c.tipo === "fixo") return Number(c.valor_fixo || 0);
  if (c.tipo === "variavel") return Number(c.valor_variavel || 0);
  return Number(c.valor_fixo || 0) + Number(c.valor_variavel || 0);
};

// ────────── MENSAGENS ──────────
export function useMensagens(etapa: string) {
  return useQuery<Mensagem[]>({
    queryKey: ["hub_mensagens", etapa],
    queryFn: async () => {
      const { data, error } = await sb.from("mensagens").select("*").eq("etapa", etapa).order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateMensagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, corpo }: { id: string; corpo: string }) => {
      const { error } = await sb.from("mensagens").update({ corpo, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub_mensagens"] }),
  });
}

// ────────── HELPERS ──────────
// Os valores numéricos de `passo` dos leads já existentes NUNCA são renumerados —
// isso preservaria a etapa real deles só depois que uma migração rodasse no banco,
// e o front já mostraria os rótulos novos antes disso, criando etapas erradas para
// leads antigos. Por isso "Negociação" entra com um valor NOVO (9), sem deslocar
// nenhuma etapa existente; a ordem visual no funil vem de `STAGE_ORDER`, separada
// do valor numérico armazenado. "Declinado" não é uma etapa: é só um status
// (ver `isDeclined`) — o `passo` de um lead declinado continua sendo a etapa real
// em que ele estava.
export const STAGE_NEGOCIACAO = 9;
export const STAGE_CONFIRMADO = 6;
export const STAGE_CONTRATO = 7;
/** Etapas removidas do funil visual; os registros históricos delas ficam agrupados em Negociação. */
export const LEGACY_NEGOTIATION_STAGES = [3, 4, 5];
export const PASSO_LABELS: Record<number, string> = {
  0: "P0 — Cadastro",
  1: "P1 — Abordagem",
  2: "P2 — Qualificação",
  3: "P3 — Mapa enviado",
  4: "P4 — Voos sugeridos",
  5: "P5 — Go / No-go",
  6: "P6 — Confirmado",
  7: "P7 — Contrato",
  [STAGE_NEGOCIACAO]: "Negociação",
};
/** Ordem visual das etapas no funil (kanban, filtros, seletores) — independente
 * do valor numérico de `passo` armazenado no banco. */
export const STAGE_ORDER = [0, 1, 2, STAGE_NEGOCIACAO, 6, 7];
/** Etapas consideradas "em negociação ativa" para os indicadores do dashboard. */
export const NEGOTIATION_STAGES = [STAGE_NEGOCIACAO, ...LEGACY_NEGOTIATION_STAGES];
/** Converte os passos antigos P3/P4/P5 para a única coluna de Negociação sem perder os dados históricos. */
export const pipelineStage = (passo: number): number =>
  LEGACY_NEGOTIATION_STAGES.includes(passo) ? STAGE_NEGOCIACAO : passo;
/** Rótulo de uma etapa com fallback — leads antigos que usavam o sentinela
 * legado (passo=8, "Declinado" antes de virar status) não têm entrada aqui. */
export const passoLabel = (n: number): string => PASSO_LABELS[n] ?? "Etapa anterior (legado)";

export const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

export const respLabel = (r: string) =>
  r === "roque" ? "Roque" : r === "caetano" ? "Caetano" : "Caetano + Roque";
export const respClass = (r: string) =>
  r === "roque" ? "resp-roque" : r === "caetano" ? "resp-caetano" : "resp-ambos";

// ────────── STATUS ESTRUTURADO ──────────
export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "abordado", label: "Abordado" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "confirmado", label: "Confirmado" },
  { value: "declinado", label: "Declinado" },
];
const STATUS_ALIASES: Record<string, string> = {
  cadastro: "novo",
  cadastrado: "novo",
  indefinido: "novo",
  "": "novo",
  negociacao: "em_negociacao",
  "em negociacao": "em_negociacao",
  "em negociação": "em_negociacao",
};
/** Normaliza um status livre antigo para um dos valores estruturados. */
export const normalizeStatus = (s: string | null | undefined): string => {
  if (!s) return "novo";
  const low = s.toLowerCase().trim();
  if (STATUS_ALIASES[low]) return STATUS_ALIASES[low];
  if (STATUS_OPTIONS.some((o) => o.value === low)) return low;
  return s; // status desconhecido: exibe como veio
};
/** Status efetivo mostrado no CRM. P6 é a confirmação; fora de P6, "Confirmado"
 * é tratado como negociação até o registro ser persistido novamente. */
export const effectiveLeadStatus = (lead: Pick<Lead, "passo" | "status">): string => {
  const status = normalizeStatus(lead.status);
  if (status === "declinado") return status;
  if (lead.passo === STAGE_CONFIRMADO) return "confirmado";
  return status === "confirmado" ? "em_negociacao" : status;
};
export const isConfirmedLead = (lead: Pick<Lead, "passo" | "status">): boolean =>
  effectiveLeadStatus(lead) === "confirmado" && lead.passo === STAGE_CONFIRMADO;
function normalizeLeadForView(lead: Lead): Lead {
  return { ...lead, status: effectiveLeadStatus(lead) };
}

// ────────── PARTICIPANT ACTIVITIES (timeline da Pré-viagem) ──────────
export function useParticipantActivities(participantId: string | null) {
  return useQuery<ParticipantActivity[]>({
    queryKey: ["hub_participant_activities", participantId],
    enabled: !!participantId,
    queryFn: async () => {
      if (!participantId) return [];
      const { data, error } = await sb
        .from("participant_activities")
        .select("*")
        .eq("participant_id", participantId)
        .order("created_at", { ascending: false });
      if (error && isMissingCommercialTable(error)) return [];
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateParticipantActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { participant_id: string; conteudo: string; autor?: string | null; tipo?: string; created_at?: string }) => {
      const { data, error } = await sb.from("participant_activities").insert(a).select().single();
      if (error && isMissingCommercialTable(error)) return null;
      if (error) throw error;
      return data as ParticipantActivity;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["hub_participant_activities", v.participant_id] }),
  });
}

export function useUpdateParticipantActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { id: string; participant_id: string; conteudo: string }) => {
      const { error } = await sb.from("participant_activities").update({ conteudo: a.conteudo }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["hub_participant_activities", v.participant_id] }),
  });
}

export function useDeleteParticipantActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { id: string; participant_id: string }) => {
      const { error } = await sb.from("participant_activities").delete().eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["hub_participant_activities", v.participant_id] }),
  });
}

export async function copyLeadHistoryToParticipant(leadId: string, participantId: string) {
  const { data, error } = await sb
    .from("lead_activities")
    .select("conteudo, autor, tipo, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });
  if (error && isMissingCommercialTable(error)) return;
  if (error) throw error;
  if (!data?.length) return;
  const rows = data.map((a: Pick<LeadActivity, "conteudo" | "autor" | "tipo" | "created_at">) => ({ ...a, participant_id: participantId }));
  const { error: insertError } = await sb.from("participant_activities").insert(rows);
  if (insertError && isMissingCommercialTable(insertError)) return;
  if (insertError) throw insertError;
}

async function mirrorLeadActivityToParticipants(leadId: string, activity: LeadActivity) {
  const { data: lead, error: leadError } = await sb.from("leads_crm").select("nome").eq("id", leadId).maybeSingle();
  if (leadError || !lead?.nome) return;
  const { data: participants, error: participantsError } = await sb.from("participants").select("id").eq("nome", lead.nome);
  if (participantsError || !participants?.length) return;
  const rows = participants.map((participant: Pick<Participant, "id">) => ({
    participant_id: participant.id,
    conteudo: activity.conteudo,
    autor: activity.autor,
    tipo: activity.tipo,
    created_at: activity.created_at,
  }));
  const { error } = await sb.from("participant_activities").insert(rows);
  // Em instalações antigas, a migration pode ainda não ter criado a tabela;
  // a timeline vinculada continua exibindo a nota comercial nesse intervalo.
  if (error && !isMissingCommercialTable(error)) return;
}
/** Regra única do funil: apenas P6 pode carregar o status Confirmado.
 * Ao confirmar, o lead vai para P6; ao retornar de P6, deixa de ser confirmado. */
export function enforceLeadWorkflowState<T extends Partial<Pick<Lead, "passo" | "status">>>(
  patch: T,
  current?: Pick<Lead, "passo" | "status">,
): T {
  const next = { ...patch } as T & { passo?: number; status?: string | null };
  let passo = next.passo ?? current?.passo;
  let status = normalizeStatus(next.status ?? current?.status);

  // Escolher explicitamente o status Confirmado sempre promove para P6. Já uma mudança
  // de etapa para fora de P6 rebaixa o status, em vez de devolver o card ao P6.
  if (patch.status !== undefined && normalizeStatus(patch.status) === "confirmado") passo = STAGE_CONFIRMADO;
  if (passo === STAGE_CONFIRMADO && status !== "declinado") status = "confirmado";
  if (passo !== undefined && passo !== STAGE_CONFIRMADO && status === "confirmado") status = "em_negociacao";

  if (patch.passo !== undefined || passo === STAGE_CONFIRMADO) next.passo = passo;
  if (patch.status !== undefined || passo === STAGE_CONFIRMADO || (current && current.passo === STAGE_CONFIRMADO && passo !== STAGE_CONFIRMADO)) next.status = status;
  return next;
}
export const statusLabel = (s: string | null | undefined): string => {
  const v = normalizeStatus(s);
  return STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
};
export const STATUS_BADGE_CLASS: Record<string, string> = {
  novo: "badge-neutral",
  abordado: "badge-blue",
  em_negociacao: "badge-warn",
  confirmado: "badge-ok",
  declinado: "badge-danger",
};
export const statusBadgeClass = (s: string | null | undefined) =>
  STATUS_BADGE_CLASS[normalizeStatus(s)] ?? "badge-neutral";

/** Um lead declinado deixa de ser ativo (não conta no funil, não aparece no pipeline normal).
 * É puramente uma questão de status — o `passo` continua guardando a etapa real em que
 * o lead estava, para que a reativação volte a um lugar coerente. */
export const isDeclined = (l: Lead): boolean =>
  normalizeStatus(l.status) === "declinado";

// ────────── AVATAR / COR DE RESPONSÁVEL ──────────
const RESP_HUES = [210, 262, 330, 150, 25, 190, 285, 95, 45, 0];
export function respAvatar(nome: string): { initials: string; color: string } {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  const parts = nome.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  return { initials: initials || "?", color: `hsl(${RESP_HUES[h % RESP_HUES.length]} 42% 46%)` };
}
