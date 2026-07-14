import { useState } from "react";
import { MensagensAccordion } from "@/components/hub/MensagensAccordion";
import { PendenciasList } from "@/components/hub/PendenciasList";

export function ViagemPage({ sub }: { sub: string }) {
  if (sub === "prog") return <Programacao />;
  if (sub === "pend") return <PendenciasList fase="viagem" title="Pendências operacionais — por etapa da viagem" />;
  if (sub === "msgs")
    return (
      <MensagensAccordion
        etapa="viagem"
        intro="A comunicação durante a missão é principalmente presencial. As mensagens abaixo complementam os momentos-chave via grupo de WhatsApp."
      />
    );
  return <ViagemDash />;
}

function ViagemDash() {
  return (
    <div className="main">
      <div className="metrics">
        <Metric icon="ti-map-pin" label="Cidades" value="3" sub="Pequim · Xangai · Hangzhou" />
        <Metric icon="ti-calendar" label="Duração" value="9" sub="dias de imersão" />
        <Metric icon="ti-users" label="Participantes" value="20–25" sub="executivos C-level" />
        <Metric icon="ti-video" label="Vídeos a gravar" value="~225" sub="1 min/pessoa/dia" cls="metric-warn" />
      </div>
      <div className="nota-critica">
        <strong><i className="ti ti-alert-triangle" /> Ponto mais frágil:</strong> O pilar "leitura executiva / aplicabilidade" não tem entrega garantida enquanto o facilitador do debrief diário não estiver definido.
      </div>
    </div>
  );
}

function Metric({ icon, label, value, sub, cls }: any) {
  return (
    <div className="metric-card">
      <div className="metric-label"><i className={`ti ${icon}`} />{label}</div>
      <div className={`metric-value ${cls ?? ""}`}>{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}

const CITIES: { id: string; label: string; icon: string; day: string; title: string; blocks: { label: string; content: string; resp?: string; alert?: string }[] }[] = [
  {
    id: "embarque", label: "Dia 0 — Embarque", icon: "ti-plane-departure", day: "Dia 0 — Embarque", title: "Brasil → China",
    blocks: [
      { label: "Evento", content: "Saída pelo terminal BTG (a confirmar). Possível upgrade Emirates.", alert: "BTG/Emirates não confirmado" },
      { label: "Comunicação", content: "Mensagem no grupo da turma criando clima de 'começou de verdade'." },
      { label: "Responsável", content: "Caetano ou Roque (presença a definir)", alert: "Presença não definida" },
      { label: "Pendência", content: "Confirmar BTG/Emirates. Definir quem viaja com o grupo." },
    ],
  },
  {
    id: "beijing", label: "Pequim", icon: "ti-building", day: "Dias 1–3 — Pequim", title: "Capital política da China",
    blocks: [
      { label: "Manhã / tarde", content: "Visitas e encontros curados: empresas, institutos, interlocutores.", resp: "Zé Ricardo/Lit + intérprete" },
      { label: "Debrief", content: "O que vimos. O que aplica ao nosso negócio.", alert: "Facilitador não definido" },
      { label: "Vídeo diário", content: "Gravação de 1 min por participante. ~20-25 vídeos/dia.", alert: "Fluxo não definido" },
      { label: "Jantar", content: "Incluído. Momentos Michelin em pontos específicos.", resp: "Logística local" },
    ],
  },
  {
    id: "shanghai", label: "Xangai", icon: "ti-building-skyscraper", day: "Dias 4–6 — Xangai", title: "Capital financeira da China",
    blocks: [
      { label: "Manhã / tarde", content: "Visitas a empresas de IA financeiro, fintech e operações em escala.", resp: "Zé Ricardo/Lit + intérprete" },
      { label: "Debrief", content: "Download diário — foco em aplicabilidade.", alert: "Facilitador não definido" },
      { label: "Transição Pequim → Xangai", content: "Voo ou trem-bala. Bagagem e check-in/out hotéis 5★.", alert: "Sem checklist formal" },
      { label: "Vídeo + Jantar", content: "Rotina diária + jantar Michelin previsto em Xangai." },
    ],
  },
  {
    id: "hangzhou", label: "Hangzhou", icon: "ti-trees", day: "Dias 7–8 — Hangzhou", title: "Capital tecnológica — ecossistema Alibaba",
    blocks: [
      { label: "Manhã / tarde", content: "Visitas ao ecossistema tech: IA aplicada, produção, plataformas.", resp: "Zé Ricardo/Lit + intérprete" },
      { label: "Debrief integrador", content: "Integração dos aprendizados das 3 cidades.", alert: "Facilitador não definido" },
      { label: "Transição Xangai → Hangzhou", content: "Trem-bala (~1h).", alert: "Sem checklist formal" },
      { label: "Vídeo + Jantar", content: "Segundo jantar Michelin. Gravação individual." },
    ],
  },
  {
    id: "retorno", label: "Retorno + Pós", icon: "ti-plane-arrival", day: "Dia 9 — Retorno", title: "China → Brasil",
    blocks: [
      { label: "Fechamento", content: "Saída da China. Mensagem de despedida plantando expectativa do download pós-viagem." },
      { label: "Comunicação", content: "Agradecimento com prévia do que vem a seguir.", resp: "Caetano" },
      { label: "Pós-viagem (até D+14)", content: "Síntese executiva da imersão.", alert: "Formato e prazo não definidos" },
      { label: "Reengajamento 2027", content: "Pesquisa de satisfação + convite para edição 2027.", alert: "Loop inexistente no desenho atual" },
    ],
  },
];

function Programacao() {
  const [city, setCity] = useState("embarque");
  const c = CITIES.find((x) => x.id === city)!;
  return (
    <div className="main">
      <div className="section-label" style={{ marginTop: 0 }}>Programação detalhada por cidade / etapa</div>
      <div className="city-tabs">
        {CITIES.map((x) => (
          <button key={x.id} className={`city-btn${city === x.id ? " active" : ""}`} onClick={() => setCity(x.id)}>
            <i className={`ti ${x.icon}`} style={{ fontSize: 13, verticalAlign: -2 }} /> {x.label}
          </button>
        ))}
      </div>
      <div className="day-card">
        <div className="day-header">
          <div className="day-num">{c.day}</div>
          <div className="day-city">{c.title}</div>
        </div>
        <div className="day-blocks">
          {c.blocks.map((b, i) => (
            <div className="day-block" key={i}>
              <div className="block-label">{b.label}</div>
              <div className="block-content">{b.content}</div>
              {b.resp && <div className="block-resp">{b.resp}</div>}
              {b.alert && <div className="block-alert"><i className="ti ti-alert-circle" style={{ fontSize: 11 }} /> {b.alert}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
