// Etapas do board de Pré-Viagem, em ordem. Fonte única usada tanto pelo Kanban
// (colunas) quanto pela configuração de automação de e-mails, para que as duas
// telas nunca discordem sobre quais etapas existem nem sobre como chamá-las.
export const TPS = ["D-60", "D-45", "D-30", "D-21", "D-14", "D-7", "D-3"];
export const TP_NAMES: Record<string, string> = {
  "D-60": "Kickoff", "D-45": "Aquecimento", "D-30": "Logística",
  "D-21": "Dicas", "D-14": "Confirmação", "D-7": "Vídeos", "D-3": "Pré-embarque",
};
export const TP_DAYS: Record<string, number> = { "D-60": 60, "D-45": 45, "D-30": 30, "D-21": 21, "D-14": 14, "D-7": 7, "D-3": 3 };
export const DEPARTURE_DATE = new Date("2026-10-28");

/** Identificador do pipeline em `pipeline_email_automations`. */
export const PRE_VIAGEM_PIPELINE_ID = "pre_viagem";

/** Colunas do board, na ordem em que aparecem. O índice de cada etapa é o
 * "stage index" usado pelo Kanban — ver getStageIndex em PreViagemKanban. */
export const ETAPA_KEYS = ["formulario_enviado", "formulario_preenchido", ...TPS, "done"];

const ETAPA_LABELS: Record<string, string> = {
  formulario_enviado: "Formulário Enviado",
  formulario_preenchido: "Formulário preenchido",
  done: "Concluído",
};

/** Nome amigável da etapa, usado nas telas e nos placeholders de e-mail. */
export function etapaLabel(key: string | null | undefined): string {
  if (!key) return "—";
  return ETAPA_LABELS[key] ?? (TP_NAMES[key] ? `${key} · ${TP_NAMES[key]}` : key);
}

/** Cor e ícone de cada etapa. Ficam aqui — e não no Kanban — para que a tela de
 * Configurações identifique as etapas exatamente como o board: quem configura a
 * automação do "D-30" vê o mesmo roxo da coluna que vai disparar o e-mail. */
export const ETAPA_CORES: Record<string, string> = {
  formulario_enviado: "#8a6d3b", formulario_preenchido: "#3f7d5c",
  "D-60": "#185fa5", "D-45": "#4a6fc0", "D-30": "#7268c4", "D-21": "#945dbb",
  "D-14": "#ad5299", "D-7": "#bc4767", "D-3": "#c0392b", done: "#0f6e56",
};
export const ETAPA_ICONES: Record<string, string> = {
  formulario_enviado: "ti-clipboard-text", formulario_preenchido: "ti-clipboard-check",
  "D-60": "ti-video", "D-45": "ti-flame", "D-30": "ti-plane-departure", "D-21": "ti-bulb",
  "D-14": "ti-checklist", "D-7": "ti-movie", "D-3": "ti-luggage", done: "ti-confetti",
};

export const etapaCor = (key: string) => ETAPA_CORES[key] ?? "#888";
export const etapaIcone = (key: string) => ETAPA_ICONES[key] ?? "ti-point";
