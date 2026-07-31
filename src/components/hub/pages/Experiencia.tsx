import { useEffect, useRef, useState } from "react";
import { useParticipants, useParticipantResponse, useUpsertParticipantResponseSection } from "@/lib/hub-api";
import { SECTIONS, emptyParticipantResponseDefaults, type SectionKey, type SecaoStatus, type SecoesConcluidas } from "@/lib/experiencia-form.types";
import { ShortTextField, LongTextField, SingleChoiceField, MultiChoiceField, DateField } from "@/components/hub/experiencia/fields";

const REQUIRED_SECTIONS: SectionKey[] = SECTIONS.filter((s) => s.camposObrigatorios.length > 0).map((s) => s.key);
const PASSAPORTE_VALIDADE_MIN = "2026-11-09";

function isEmptyValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function sectionIsEmpty(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0 || data.every(sectionIsEmpty);
  if (data && typeof data === "object") return Object.values(data as Record<string, unknown>).every(isEmptyValue);
  return isEmptyValue(data);
}

function computeAutoStatus(section: SectionKey, data: unknown, previous: SecaoStatus): SecaoStatus {
  if (sectionIsEmpty(data)) return "nao_iniciada";
  const required = SECTIONS.find((s) => s.key === section)?.camposObrigatorios ?? [];
  if (required.length) {
    const record = (data ?? {}) as Record<string, unknown>;
    const allFilled = required.every((k) => !isEmptyValue(record[k]));
    return allFilled ? "concluida" : "em_andamento";
  }
  return previous === "concluida" ? "concluida" : "em_andamento";
}

/** Combobox de participante — mesmo padrão de `AutorSelect` em ResponsavelSelect.tsx, alimentado por useParticipants(). */
function ParticipantSelect({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const { data: participants = [] } = useParticipants();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = participants.filter(
    (p) => !q || p.nome.toLowerCase().includes(q) || (p.empresa ?? "").toLowerCase().includes(q),
  );
  const selected = participants.find((p) => p.id === value) ?? null;

  return (
    <div className="resp-select resp-select-single" ref={boxRef}>
      <div className="resp-select-control" onClick={() => setOpen(true)}>
        {selected && (
          <span className="resp-chip" title={selected.nome}>
            <span className="resp-chip-name">{selected.nome}{selected.empresa ? ` · ${selected.empresa}` : ""}</span>
          </span>
        )}
        <input
          className="resp-select-input"
          value={query}
          placeholder={selected ? "" : "Selecione um participante…"}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (
        <div className="resp-select-menu">
          {filtered.map((p) => (
            <button
              type="button"
              key={p.id}
              className={`resp-select-option${value === p.id ? " selected" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(p.id); setQuery(""); setOpen(false); }}
            >
              <span className="resp-select-option-name">{p.nome}{p.empresa ? ` · ${p.empresa}` : ""}</span>
              {value === p.id && <i className="ti ti-check" style={{ marginLeft: "auto", color: "var(--teal)" }} />}
            </button>
          ))}
          {filtered.length === 0 && <div className="resp-select-empty">Nenhum participante encontrado.</div>}
        </div>
      )}
    </div>
  );
}

function SectionFields({ section, draft, setDraft }: { section: SectionKey; draft: any; setDraft: (updater: (prev: any) => any) => void }) {
  const set = (key: string) => (v: unknown) => setDraft((prev: any) => ({ ...(prev ?? {}), [key]: v }));

  switch (section) {
    case "identificacao":
      return (
        <>
          <ShortTextField numero="01" label="Nome completo" required value={draft.nome_completo ?? ""} onChange={set("nome_completo")} />
          <ShortTextField numero="02" label="Nome pelo qual prefere ser chamado(a)" value={draft.nome_preferido ?? ""} onChange={set("nome_preferido")} />
          <ShortTextField numero="03" label="Empresa" required value={draft.empresa ?? ""} onChange={set("empresa")} />
          <ShortTextField numero="04" label="Cargo" required value={draft.cargo ?? ""} onChange={set("cargo")} />
          <ShortTextField numero="05" label="Cidade / Estado" value={draft.cidade_estado ?? ""} onChange={set("cidade_estado")} />
          <DateField numero="06" label="Data de nascimento" value={draft.data_nascimento ?? ""} onChange={set("data_nascimento")} />
          <ShortTextField numero="07" label="Telefone" required type="tel" value={draft.telefone ?? ""} onChange={set("telefone")} />
          <ShortTextField numero="08" label="E-mail" required type="email" value={draft.email ?? ""} onChange={set("email")} />
          <MultiChoiceField
            numero="09"
            label="Em quais idiomas, além do português, você se comunica com fluência?"
            value={draft.idiomas ?? []}
            onChange={set("idiomas")}
            outro
            outroValue={draft.idiomas_outro ?? ""}
            onOutroChange={set("idiomas_outro")}
            options={[
              { value: "portugues_nativo", label: "Português (nativo)" },
              { value: "ingles", label: "Inglês" },
              { value: "mandarim", label: "Mandarim" },
              { value: "espanhol", label: "Espanhol" },
              { value: "outro", label: "Outro" },
            ]}
          />
          <div className="exp-field-note">Todos os campos serão tratados com confidencialidade.</div>
        </>
      );

    case "historia_objetivos":
      return (
        <>
          <LongTextField numero="01" label="O que motivou sua decisão de participar da Imersão China 2026?" value={draft.motivacao ?? ""} onChange={set("motivacao")} />
          <LongTextField numero="02" label="Qual é a principal transformação ou resultado que você espera obter ao final desta experiência?" value={draft.transformacao_esperada ?? ""} onChange={set("transformacao_esperada")} />
          <MultiChoiceField
            numero="03"
            label="Existe algum tema específico que você gostaria de aprofundar durante a imersão?"
            value={draft.temas_interesse ?? []}
            onChange={set("temas_interesse")}
            outro
            outroValue={draft.temas_interesse_outro ?? ""}
            onOutroChange={set("temas_interesse_outro")}
            options={[
              { value: "ia", label: "IA" },
              { value: "industria_manufatura", label: "Indústria e manufatura" },
              { value: "varejo_consumo", label: "Varejo e consumo" },
              { value: "mobilidade", label: "Mobilidade" },
              { value: "smart_cities", label: "Smart Cities" },
              { value: "educacao", label: "Educação" },
              { value: "saude", label: "Saúde" },
              { value: "sustentabilidade", label: "Sustentabilidade" },
              { value: "outro", label: "Outro" },
            ]}
          />
          <LongTextField numero="04" label="Se pudesse voltar ao Brasil com apenas um grande aprendizado desta jornada, qual gostaria que fosse?" value={draft.aprendizado_unico ?? ""} onChange={set("aprendizado_unico")} />
          <LongTextField numero="05" label="Existe algum desafio profissional atual que você espera solucionar ou evoluir a partir das referências e aprendizados da China?" value={draft.desafio_profissional ?? ""} onChange={set("desafio_profissional")} />
          <LongTextField
            numero="06"
            label="Das empresas que vamos visitar (Alibaba, Huawei, Unitree, DeepSeek, United Imaging, BSI Logistics, China-BRICS AI Center, East Concord Law Firm), há alguma com que você gostaria de ter uma conversa mais aprofundada ou levar uma pergunta específica do seu negócio?"
            value={draft.empresa_conversa_aprofundada ?? ""}
            onChange={set("empresa_conversa_aprofundada")}
          />
          <LongTextField numero="07" label="Existe alguma outra empresa, instituição ou experiência — além das citadas no material da imersão — que você gostaria que buscássemos incluir na sua agenda?" value={draft.outra_empresa_sugestao ?? ""} onChange={set("outra_empresa_sugestao")} />
          <div className="exp-field-note">Respostas orientam a curadoria da agenda de cada participante.</div>
        </>
      );

    case "cuidados":
      return (
        <>
          <LongTextField numero="01" label="O que faz você se sentir acolhido(a) e bem cuidado(a) durante viagens e experiências internacionais?" value={draft.o_que_acolhe ?? ""} onChange={set("o_que_acolhe")} />
          <LongTextField numero="02" label="Existe algo que costuma gerar desconforto ou preocupação em viagens?" value={draft.desconforto_viagens ?? ""} onChange={set("desconforto_viagens")} />
          <LongTextField numero="03" label="Você possui alguma necessidade especial, restrição física ou condição que gostaria que nossa equipe conhecesse para melhor apoiá-lo(a)?" value={draft.necessidade_especial ?? ""} onChange={set("necessidade_especial")} />
          <LongTextField numero="04" label="Existe alguma data importante durante o período da imersão (aniversário, celebração especial ou marco profissional) que deveríamos saber?" value={draft.data_importante ?? ""} onChange={set("data_importante")} />
          <LongTextField
            numero="05"
            label="Considerando que o roteiro inclui caminhadas longas e a subida à Muralha da China (com opção de teleférico), como você avalia sua disposição física para esse tipo de atividade?"
            value={draft.disposicao_fisica ?? ""}
            onChange={set("disposicao_fisica")}
          />
        </>
      );

    case "preferencias": {
      const gostoOptions = [
        { value: "gastronomia", label: "Gastronomia" },
        { value: "historia_cultura", label: "História e cultura" },
        { value: "tecnologia_inovacao", label: "Tecnologia e inovação" },
        { value: "compras", label: "Compras" },
        { value: "networking", label: "Networking" },
        { value: "experiencias_locais", label: "Experiências locais" },
        { value: "arquitetura", label: "Arquitetura" },
        { value: "outro", label: "Outro" },
      ];
      return (
        <>
          <MultiChoiceField
            numero="01"
            label="Cite três coisas que você gosta muito (em viagens)"
            value={draft.gosta_muito ?? []}
            onChange={set("gosta_muito")}
            options={gostoOptions}
            max={3}
            outro
            outroValue={draft.gosta_muito_outro ?? ""}
            onOutroChange={set("gosta_muito_outro")}
          />
          <MultiChoiceField
            numero="02"
            label="Cite três coisas que você prefere evitar ou que não aprecia"
            value={draft.prefere_evitar ?? []}
            onChange={set("prefere_evitar")}
            options={gostoOptions}
            max={3}
            outro
            outroValue={draft.prefere_evitar_outro ?? ""}
            onOutroChange={set("prefere_evitar_outro")}
          />
          <SingleChoiceField
            numero="03"
            label="Como você prefere aproveitar momentos livres durante viagens?"
            value={draft.momentos_livres ?? ""}
            onChange={set("momentos_livres")}
            options={[
              { value: "reservada", label: "Mais reservada" },
              { value: "sociavel", label: "Mais sociável" },
              { value: "depende", label: "Depende do contexto" },
            ]}
          />
        </>
      );
    }

    case "gastronomia":
      return (
        <>
          <SingleChoiceField numero="01" label="Você possui alguma restrição alimentar?" value={draft.restricao_alimentar ?? ""} onChange={set("restricao_alimentar")} options={[{ value: "nao", label: "Não" }, { value: "sim", label: "Sim" }]} />
          {draft.restricao_alimentar === "sim" && (
            <ShortTextField numero="" label="Qual?" value={draft.restricao_alimentar_qual ?? ""} onChange={set("restricao_alimentar_qual")} />
          )}
          <SingleChoiceField numero="02" label="Possui alguma alergia alimentar?" value={draft.alergia_alimentar ?? ""} onChange={set("alergia_alimentar")} options={[{ value: "nao", label: "Não" }, { value: "sim", label: "Sim" }]} />
          {draft.alergia_alimentar === "sim" && (
            <ShortTextField numero="" label="Qual?" value={draft.alergia_alimentar_qual ?? ""} onChange={set("alergia_alimentar_qual")} />
          )}
          <ShortTextField numero="03" label="Existe algum alimento que você evita consumir?" value={draft.alimento_evita ?? ""} onChange={set("alimento_evita")} />
          <LongTextField numero="04" label="Existe algum alimento que consome por motivos religiosos, culturais ou pessoais e que devemos respeitar?" value={draft.alimento_religioso_cultural ?? ""} onChange={set("alimento_religioso_cultural")} />
          <MultiChoiceField
            numero="—"
            label="Quais comidas típicas chinesas você teria interesse em experimentar?"
            value={draft.comidas_interesse ?? []}
            onChange={set("comidas_interesse")}
            outro
            outroValue={draft.comidas_interesse_outro ?? ""}
            onOutroChange={set("comidas_interesse_outro")}
            options={[
              { value: "pato_pequim", label: "Pato de Pequim" },
              { value: "dumplings", label: "Dumplings" },
              { value: "hot_pot", label: "Hot Pot" },
              { value: "baozi", label: "Baozi" },
              { value: "noodles", label: "Noodles tradicionais" },
              { value: "frutos_do_mar", label: "Frutos do mar locais" },
              { value: "street_food", label: "Street food chinesa" },
              { value: "todas", label: "Todas as opções" },
              { value: "ocidentais", label: "Prefiro opções ocidentais" },
              { value: "outro", label: "Outro" },
            ]}
          />
          <LongTextField numero="—" label="Existe alguma experiência gastronômica específica que gostaria de viver na China?" value={draft.experiencia_gastronomica_especifica ?? ""} onChange={set("experiencia_gastronomica_especifica")} />
        </>
      );

    case "preparacao_viagem": {
      const validade = draft.passaporte_validade ?? "";
      const alert = validade && validade < PASSAPORTE_VALIDADE_MIN
        ? "Verifique a validade — recomendado mínimo até 09/11/2026 (6 meses após o retorno)."
        : undefined;
      return (
        <>
          <div className="section-label">Seguro e passagem</div>
          <SingleChoiceField numero="" label="Já realizou a cotação do seguro viagem?" value={draft.cotacao_seguro ?? ""} onChange={set("cotacao_seguro")} options={[{ value: "sim", label: "Sim" }, { value: "ainda_nao", label: "Ainda não" }, { value: "apoio_equipe", label: "Apoio da equipe" }]} />
          <SingleChoiceField numero="" label="Já contratou o seguro viagem?" value={draft.contratou_seguro ?? ""} onChange={set("contratou_seguro")} options={[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }]} />
          <SingleChoiceField numero="" label="Já realizou a cotação da passagem aérea?" value={draft.cotacao_passagem ?? ""} onChange={set("cotacao_passagem")} options={[{ value: "sim", label: "Sim" }, { value: "ainda_nao", label: "Ainda não" }, { value: "apoio_equipe", label: "Apoio da equipe" }]} />
          <SingleChoiceField numero="" label="Sua passagem aérea já foi emitida?" value={draft.passagem_emitida ?? ""} onChange={set("passagem_emitida")} options={[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }]} />

          <div className="section-label">Documentação</div>
          <DateField numero="" label="Qual a data de validade do seu passaporte?" value={validade} onChange={set("passaporte_validade")} min={PASSAPORTE_VALIDADE_MIN} alert={alert} />
          <SingleChoiceField numero="" label="Já possui itinerário definido para o trecho de retorno (via Dubai)?" value={draft.itinerario_retorno ?? ""} onChange={set("itinerario_retorno")} options={[{ value: "definido", label: "Sim, já defini" }, { value: "apoio_equipe", label: "Depende do apoio da equipe" }]} />

          <div className="section-label">Logística pessoal</div>
          <SingleChoiceField numero="" label="Você viajará sozinho(a) ou com acompanhante?" value={draft.companhia_viagem ?? ""} onChange={set("companhia_viagem")} options={[{ value: "sozinho", label: "Sozinho(a)" }, { value: "acompanhante_negocio", label: "Com acompanhante (nas atividades de negócio)" }, { value: "acompanhante_social", label: "Com acompanhante (só no programa social)" }]} />
          <SingleChoiceField numero="" label="Camisa tamanho" value={draft.tamanho_camisa ?? ""} onChange={set("tamanho_camisa")} options={["PP", "P", "M", "G", "GG", "XG"].map((v) => ({ value: v, label: v }))} />

          <div className="section-label">Imagem, tecnologia e conteúdo</div>
          <SingleChoiceField
            numero=""
            label="O hotel em Hangzhou (Fly Zoo) usa reconhecimento facial para check-in e outras tecnologias de IA no serviço. Você tem alguma preocupação ou preferência sobre isso?"
            value={draft.preocupacao_reconhecimento_facial ?? ""}
            onChange={set("preocupacao_reconhecimento_facial")}
            options={[{ value: "sem_preocupacao", label: "Sem preocupação" }, { value: "checkin_tradicional", label: "Prefiro check-in tradicional" }, { value: "quero_saber_mais", label: "Quero saber mais antes" }]}
          />
          <SingleChoiceField
            numero=""
            label="Autoriza o uso de fotos e vídeos seus, feitos durante a imersão, em materiais de marketing da Academy China?"
            value={draft.autorizacao_uso_imagem ?? ""}
            onChange={set("autorizacao_uso_imagem")}
            options={[{ value: "autorizo", label: "Sim, autorizo" }, { value: "autorizo_com_restricoes", label: "Sim, com restrições" }, { value: "nao_autorizo", label: "Não autorizo" }]}
          />
          {draft.autorizacao_uso_imagem === "autorizo_com_restricoes" && (
            <LongTextField numero="" label="Detalhe as restrições" value={draft.autorizacao_uso_imagem_detalhe ?? ""} onChange={set("autorizacao_uso_imagem_detalhe")} />
          )}

          <div className="nota-estrategica">
            Hoje, brasileiros podem permanecer até 30 dias na China sem necessidade de visto. Emolumentos só se aplicam caso a regra mude até a data da missão.
          </div>
        </>
      );
    }

    case "networking":
      return (
        <>
          <LongTextField numero="01" label="Existe algum participante, empresa ou setor com quem você gostaria particularmente de se conectar durante a imersão?" value={draft.conexao_desejada ?? ""} onChange={set("conexao_desejada")} />
          <LongTextField numero="02" label="Existe algum tema que você domina e teria prazer em compartilhar com o grupo?" value={draft.tema_compartilhar ?? ""} onChange={set("tema_compartilhar")} />
          <LongTextField numero="03" label="Qual competência ou conhecimento você acredita que poderá contribuir para enriquecer a experiência coletiva?" value={draft.competencia_contribuicao ?? ""} onChange={set("competencia_contribuicao")} />
          <LongTextField
            numero="04"
            label="Escreva uma breve apresentação sua (3-4 linhas) para compartilharmos com o restante do grupo antes da viagem, para que todos cheguem já se conhecendo um pouco."
            value={draft.apresentacao_breve ?? ""}
            onChange={set("apresentacao_breve")}
            note="Sugerimos até ~400 caracteres."
          />
        </>
      );

    case "indicacoes": {
      const list: any[] = Array.isArray(draft) && draft.length ? draft : [{}];
      const updateItem = (idx: number, patch: any) =>
        setDraft((prev: any) => {
          const arr = Array.isArray(prev) && prev.length ? [...prev] : [{}];
          arr[idx] = { ...(arr[idx] ?? {}), ...patch };
          return arr;
        });
      const addItem = () => setDraft((prev: any) => [...(Array.isArray(prev) ? prev : []), {}]);
      const removeItem = (idx: number) =>
        setDraft((prev: any) => (Array.isArray(prev) ? prev.filter((_: any, i: number) => i !== idx) : []));
      return (
        <>
          {list.map((item, idx) => (
            <div key={idx} className="card" style={{ padding: 16, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <strong style={{ fontSize: 12.5 }}>Indicação {idx + 1}</strong>
                {list.length > 1 && (
                  <button type="button" className="btn-secondary" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => removeItem(idx)}>
                    Remover
                  </button>
                )}
              </div>
              <ShortTextField numero="01" label="Nome" value={item.nome ?? ""} onChange={(v) => updateItem(idx, { nome: v })} />
              <ShortTextField numero="02" label="Empresa" value={item.empresa ?? ""} onChange={(v) => updateItem(idx, { empresa: v })} />
              <ShortTextField numero="03" label="Cargo" value={item.cargo ?? ""} onChange={(v) => updateItem(idx, { cargo: v })} />
              <ShortTextField numero="04" label="Telefone ou LinkedIn" value={item.contato ?? ""} onChange={(v) => updateItem(idx, { contato: v })} />
              <ShortTextField numero="05" label="E-mail" type="email" value={item.email ?? ""} onChange={(v) => updateItem(idx, { email: v })} />
              <LongTextField numero="06" label="Por que essa pessoa deveria viver essa experiência?" value={item.motivo ?? ""} onChange={(v) => updateItem(idx, { motivo: v })} />
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addItem}>
            <i className="ti ti-plus" /> Adicionar outra indicação
          </button>
        </>
      );
    }

    case "ultima_pergunta":
      return (
        <LongTextField
          numero=""
          label='Ao final da Imersão China 2026, gostaríamos que você olhasse para trás e pensasse: "Valeu a pena porque..." Como você completaria essa frase hoje?'
          prefix='Valeu a pena porque...'
          value={draft.resposta ?? ""}
          onChange={set("resposta")}
        />
      );

    case "contato_emergencia":
      return (
        <>
          <ShortTextField numero="01" label="Nome" required value={draft.nome ?? ""} onChange={set("nome")} />
          <ShortTextField numero="02" label="Parentesco" required value={draft.parentesco ?? ""} onChange={set("parentesco")} />
          <ShortTextField numero="03" label="Telefone" required type="tel" value={draft.telefone ?? ""} onChange={set("telefone")} />
          <ShortTextField numero="04" label="E-mail" type="email" value={draft.email ?? ""} onChange={set("email")} />
          <div className="exp-field-note">
            Muito obrigado por compartilhar um pouco da sua história conosco. Nossa missão é cuidar dos detalhes para que você possa se concentrar no que realmente importa: aprender, se conectar, se inspirar e voltar ao Brasil transformado pela experiência.
          </div>
        </>
      );

    default:
      return null;
  }
}

export function ExperienciaPage() {
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("identificacao");
  const [submitted, setSubmitted] = useState(false);
  const { data: response } = useParticipantResponse(participantId);
  const upsert = useUpsertParticipantResponseSection();

  const [draft, setDraft] = useState<any>(emptyParticipantResponseDefaults[activeSection]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ressincroniza o rascunho ao trocar de participante/seção, ou quando a linha é
  // criada pela primeira vez (response?.id passa de undefined para um uuid).
  useEffect(() => {
    setDraft(response ? (response as any)[activeSection] : emptyParticipantResponseDefaults[activeSection]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId, activeSection, response?.id]);

  useEffect(() => {
    if (!participantId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const previous = (response?.secoes_concluidas?.[activeSection] ?? "nao_iniciada") as SecaoStatus;
      const status = computeAutoStatus(activeSection, draft, previous);
      const secoesConcluidas: SecoesConcluidas = { ...(response?.secoes_concluidas ?? {}), [activeSection]: status };
      upsert.mutate({
        participantId,
        section: activeSection,
        data: draft,
        secoesConcluidas,
        status: response?.status ?? "em_andamento",
      });
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const secoesConcluidas = response?.secoes_concluidas ?? {};
  const concludedCount = SECTIONS.filter((s) => secoesConcluidas[s.key] === "concluida").length;
  const allRequiredDone = REQUIRED_SECTIONS.every((k) => secoesConcluidas[k] === "concluida");
  const activeIndex = SECTIONS.findIndex((s) => s.key === activeSection);
  const activeMeta = SECTIONS[activeIndex];
  const isLastSection = activeIndex === SECTIONS.length - 1;

  const markSectionStatus = (status: SecaoStatus) => {
    if (!participantId) return;
    const secoes: SecoesConcluidas = { ...(response?.secoes_concluidas ?? {}), [activeSection]: status };
    upsert.mutate({ participantId, section: activeSection, data: draft, secoesConcluidas: secoes, status: response?.status ?? "em_andamento" });
  };

  const handleFinalize = () => {
    if (!participantId || !allRequiredDone) return;
    upsert.mutate(
      { participantId, section: activeSection, data: draft, secoesConcluidas: response?.secoes_concluidas ?? {}, status: "concluido" },
      { onSuccess: () => setSubmitted(true) },
    );
  };

  if (submitted) {
    return (
      <div className="exp-thanks">
        <i className="ti ti-check" style={{ fontSize: 40, color: "var(--teal)" }} />
        <h2>Obrigado.</h2>
        <p>Recebemos suas respostas. Nossa equipe vai usar isso para desenhar sua experiência na Imersão China 2026.</p>
        <button
          className="btn-primary"
          onClick={() => { setSubmitted(false); setParticipantId(null); setActiveSection("identificacao"); }}
        >
          Preencher outro participante
        </button>
      </div>
    );
  }

  return (
    <div className="exp-shell">
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div className="exp-picker">
          <ParticipantSelect value={participantId} onChange={setParticipantId} />
          {participantId && (
            <span className="exp-picker-progress">{concludedCount} de {SECTIONS.length} seções concluídas</span>
          )}
        </div>

        {!participantId ? (
          <div className="tl-empty" style={{ margin: 40 }}>
            <i className="ti ti-user-search" />
            Selecione um participante acima para começar a preencher o formulário.
          </div>
        ) : (
          <div className="exp-body">
            <nav className="exp-sidebar">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`exp-section-item${s.key === activeSection ? " active" : ""}`}
                  onClick={() => setActiveSection(s.key)}
                >
                  <span className="exp-section-num">{s.numero}</span>
                  <span className="exp-section-label">{s.titulo}</span>
                  <span className={`exp-section-dot ${secoesConcluidas[s.key] ?? "nao_iniciada"}`}>
                    {secoesConcluidas[s.key] === "concluida" && <i className="ti ti-check" />}
                  </span>
                </button>
              ))}
            </nav>

            <div className="exp-content">
              <div className="exp-section-header">
                <h2>{activeMeta.numero} · {activeMeta.titulo}</h2>
                <p>{activeMeta.subtitulo}</p>
              </div>

              <SectionFields section={activeSection} draft={draft} setDraft={setDraft} />

              <div className="exp-footer">
                {activeMeta.camposObrigatorios.length === 0 && (
                  secoesConcluidas[activeSection] === "concluida" ? (
                    <button className="btn-secondary" onClick={() => markSectionStatus("em_andamento")}>Reabrir seção</button>
                  ) : (
                    <button className="btn-secondary" onClick={() => markSectionStatus("concluida")}>Marcar seção como concluída</button>
                  )
                )}
                {!isLastSection ? (
                  <button className="btn-primary" style={{ marginLeft: "auto" }} onClick={() => setActiveSection(SECTIONS[activeIndex + 1].key)}>
                    Continuar <i className="ti ti-arrow-right" />
                  </button>
                ) : (
                  <button className="btn-primary" style={{ marginLeft: "auto" }} disabled={!allRequiredDone} onClick={handleFinalize}>
                    Enviar formulário
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
