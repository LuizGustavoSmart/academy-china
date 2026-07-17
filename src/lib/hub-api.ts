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

// ────────── PARTICIPANTS ──────────
export function useParticipants() {
  return useQuery<Participant[]>({
    queryKey: ["hub_participants"],
    queryFn: async () => {
      const { data, error } = await sb.from("participants").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
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
      const { data, error } = await sb.from("leads_crm").select("*").order("passo").order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (l: Partial<Lead>) => {
      const { data, error } = await sb.from("leads_crm").insert(l).select().single();
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
      const { error } = await sb.from("leads_crm").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
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
export const PASSO_LABELS: Record<number, string> = {
  0: "P0 — Cadastro",
  1: "P1 — Abordagem",
  2: "P2 — Qualificação",
  3: "P3 — Mapa enviado",
  4: "P4 — Voos sugeridos",
  5: "P5 — Go / No-go",
  6: "P6 — Contrato",
  7: "P7 — Confirmado",
  8: "Declinado",
};

export const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

export const respLabel = (r: string) =>
  r === "roque" ? "Roque" : r === "caetano" ? "Caetano" : "Caetano + Roque";
export const respClass = (r: string) =>
  r === "roque" ? "resp-roque" : r === "caetano" ? "resp-caetano" : "resp-ambos";
