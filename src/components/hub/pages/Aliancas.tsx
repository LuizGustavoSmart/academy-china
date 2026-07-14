import { useState } from "react";

type Aliado = {
  id: string;
  nome: string;
  responsavel: string;
  descricao: string;
  mensagem_envio_material?: string;
  marketing: {
    foco: string;
    canais: string[];
    acoes: { titulo: string; detalhe: string }[];
  };
};

const ALIADOS: Aliado[] = [
  {
    id: "privilege",
    nome: "Privilege",
    responsavel: "Roque Almeida",
    descricao:
      "Clube de benefícios e relacionamento voltado a executivos e empresários de alta renda. A aliança amplia o alcance da Academy China junto a decisores com perfil de investimento e apetite internacional.",
    marketing: {
      foco: "Ativação junto à base premium do Privilege, com convites segmentados e presença em eventos fechados.",
      canais: ["E-mail marketing dedicado", "WhatsApp curadoria Privilege", "Eventos presenciais fechados"],
      acoes: [
        { titulo: "E-mail dedicado", detalhe: "Peça de lançamento enviada à base premium com link direto para agendamento com o Roque." },
        { titulo: "Convite VIP", detalhe: "Encontro fechado em BH para apresentação da missão a 15–20 membros selecionados." },
        { titulo: "Co-branding", detalhe: "Selo 'Curadoria Privilege' aplicado no material da missão China 2026." },
      ],
    },
  },
  {
    id: "aelo",
    nome: "AELO MG",
    responsavel: "Caetano Andrade",
    descricao:
      "Associação das Empresas do Mercado Imobiliário de Minas Gerais. Conecta a Academy à liderança do setor imobiliário mineiro, com foco em incorporadoras e loteadoras que buscam benchmark internacional.",
    mensagem_envio_material:
      "Olá! Como associado AELO, você tem acesso exclusivo à Academy China 2026 — uma imersão curada na China para líderes do mercado imobiliário. Confira o material em anexo e agende uma conversa para saber mais.",
    marketing: {
      foco: "Endosso institucional AELO + prospecção qualificada dentro das associadas.",
      canais: ["Newsletter AELO", "LinkedIn institucional", "Café com presidentes", "Mailing de associados"],
      acoes: [
        { titulo: "Coluna na newsletter", detalhe: "Publicação mensal sobre aprendizados da missão anterior + chamada para 2026." },
        { titulo: "Café com presidentes", detalhe: "Encontro reservado com CEOs de associadas para apresentar a curadoria." },
        { titulo: "Selo AELO", detalhe: "Uso do selo institucional em landing page e peças, reforçando credibilidade." },
        { titulo: "Envio de material — benefício AELO", detalhe: "Disparo de mailing para associados com material de divulgação da Academy China como benefício da associação." },
        { titulo: "Apresentação no evento do programa", detalhe: "Apresentação da Academy China no evento do programa AELO em 19/08." },
      ],
    },
  },
  {
    id: "sinduscon",
    nome: "Sinduscon",
    responsavel: "Caetano Andrade + Roque Almeida",
    descricao:
      "Sindicato da Indústria da Construção Civil. Amplia a Academy para o ecossistema de construtoras, dando acesso a lideranças com pauta de produtividade, industrialização e novos modelos construtivos.",
    marketing: {
      foco: "Posicionar a missão como benchmark de produtividade e industrialização da construção.",
      canais: ["Comunicações institucionais Sinduscon", "Eventos setoriais", "WhatsApp de diretoria"],
      acoes: [
        { titulo: "Palestra pré-missão", detalhe: "Talk de 30 min em evento Sinduscon com cases da China aplicáveis ao setor." },
        { titulo: "E-mail institucional", detalhe: "Comunicado oficial da diretoria endossando a missão para os sindicalizados." },
        { titulo: "Cobertura pós-missão", detalhe: "Relatório executivo + vídeo curto distribuído pela base do Sinduscon." },
      ],
    },
  },
];

export function AliancasPage({ sub }: { sub: string }) {
  const [aliadoId, setAliadoId] = useState<string>(ALIADOS[0].id);
  const aliado = ALIADOS.find((a) => a.id === aliadoId) ?? ALIADOS[0];
  const [mensagens, setMensagens] = useState<Record<string, string>>(() =>
    Object.fromEntries(ALIADOS.map((a) => [a.id, a.mensagem_envio_material ?? ""]))
  );

  if (sub === "marketing") {
    return (
      <div className="main">
        <AliadoTabs aliadoId={aliadoId} setAliadoId={setAliadoId} />
        <MarketingView
          aliado={aliado}
          mensagemEnvio={mensagens[aliado.id]}
          onMensagemChange={(v) => setMensagens((prev) => ({ ...prev, [aliado.id]: v }))}
        />
      </div>
    );
  }

  return (
    <div className="main">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {ALIADOS.map((a) => (
          <AliadoCard key={a.id} aliado={a} />
        ))}
      </div>
    </div>
  );
}

function AliadoCard({ aliado }: { aliado: Aliado }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: ".5px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 18,
        borderLeft: "3px solid var(--accent)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <i className="ti ti-handshake" style={{ color: "var(--accent)", fontSize: 18 }} />
        <div style={{ fontSize: 15, fontWeight: 600 }}>{aliado.nome}</div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".04em" }}>
        Responsável
      </div>
      <div style={{ fontSize: 13, color: "var(--text)", marginTop: -6 }}>{aliado.responsavel}</div>
      <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.5 }}>{aliado.descricao}</div>
    </div>
  );
}

function AliadoTabs({ aliadoId, setAliadoId }: { aliadoId: string; setAliadoId: (id: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
      {ALIADOS.map((a) => {
        const active = a.id === aliadoId;
        return (
          <button
            key={a.id}
            onClick={() => setAliadoId(a.id)}
            style={{
              padding: "7px 14px",
              fontSize: 12.5,
              borderRadius: 8,
              border: `.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
              background: active ? "var(--accent)" : "var(--surface)",
              color: active ? "#fff" : "var(--text)",
              cursor: "pointer",
              fontWeight: active ? 600 : 500,
            }}
          >
            {a.nome}
          </button>
        );
      })}
    </div>
  );
}

function MarketingView({
  aliado,
  mensagemEnvio,
  onMensagemChange,
}: {
  aliado: Aliado;
  mensagemEnvio?: string;
  onMensagemChange?: (v: string) => void;
}) {
  const mostrarMensagem = aliado.id === "aelo";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          background: "var(--surface)",
          border: ".5px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 18,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
          Foco de marketing — {aliado.nome}
        </div>
        <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.55 }}>{aliado.marketing.foco}</div>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: ".5px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 18,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>
          Canais
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {aliado.marketing.canais.map((c) => (
            <span
              key={c}
              style={{
                fontSize: 12,
                padding: "5px 10px",
                borderRadius: 6,
                background: "var(--bg)",
                border: ".5px solid var(--border)",
                color: "var(--text2)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {mostrarMensagem && (
        <div
          style={{
            background: "var(--surface)",
            border: ".5px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 18,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>
            Mensagem do envio de material
          </div>
          <textarea
            value={mensagemEnvio}
            onChange={(e) => onMensagemChange?.(e.target.value)}
            rows={5}
            style={{
              width: "100%",
              padding: 10,
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--text)",
              background: "var(--bg)",
              border: ".5px solid var(--border)",
              borderRadius: "var(--radius)",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
            Esta mensagem acompanhará o material disparado por mailing aos associados AELO.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {aliado.marketing.acoes.map((a) => (
          <div
            key={a.titulo}
            style={{
              background: "var(--surface)",
              border: ".5px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 16,
              borderTop: "2px solid var(--accent)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{a.titulo}</div>
            <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.5 }}>{a.detalhe}</div>
          </div>
        ))}
      </div>
    </div>
  );
}