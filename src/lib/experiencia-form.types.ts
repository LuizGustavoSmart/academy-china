// Tipos e metadados do Formulário de Experiência do Participante (9 seções).
// As colunas jsonb abaixo espelham `public.participant_responses` — a coluna
// `contato_emergencia` continua existindo na tabela mas não é mais usada pelo
// formulário (dado já coletado em china.matteracademy.ai/formulario).

export type SectionKey =
  | "identificacao"
  | "historia_objetivos"
  | "cuidados"
  | "preferencias"
  | "gastronomia"
  | "preparacao_viagem"
  | "networking"
  | "indicacoes"
  | "ultima_pergunta";

export type SecaoStatus = "nao_iniciada" | "em_andamento" | "concluida";
export type SecoesConcluidas = Partial<Record<SectionKey, SecaoStatus>>;

export type ExperienciaIdentificacao = {
  nome_preferido?: string;
  cidade_estado?: string;
  idiomas?: string;
};

export type ExperienciaHistoriaObjetivos = {
  motivacao?: string;
  transformacao_esperada?: string;
  temas_interesse?: string;
  aprendizado_unico?: string;
  desafio_profissional?: string;
  empresa_conversa_aprofundada?: string;
  outra_empresa_sugestao?: string;
};

export type ExperienciaCuidados = {
  o_que_acolhe?: string;
  desconforto_viagens?: string;
  necessidade_especial?: string;
  data_importante?: string;
  disposicao_fisica?: string;
};

export type ExperienciaPreferencias = {
  gosta_muito?: string;
  prefere_evitar?: string;
  momentos_livres?: string;
};

export type ExperienciaGastronomia = {
  restricao_alimentar?: string;
  alimento_evita?: string;
  alimento_religioso_cultural?: string;
  comidas_interesse?: string;
  experiencia_gastronomica_especifica?: string;
};

export type ExperienciaPreparacaoViagem = {
  cotacao_seguro?: string;
  contratou_seguro?: string;
  itinerario_retorno?: string;
  companhia_viagem?: string;
  preocupacao_reconhecimento_facial?: string;
  autorizacao_uso_imagem?: string;
};

export type ExperienciaNetworking = {
  conexao_desejada?: string;
  tema_compartilhar?: string;
  competencia_contribuicao?: string;
  apresentacao_breve?: string;
};

export type ExperienciaIndicacao = {
  nome?: string;
  empresa?: string;
  cargo?: string;
  contato?: string;
  email?: string;
  motivo?: string;
};
export type ExperienciaIndicacoes = ExperienciaIndicacao[];

export type ExperienciaUltimaPergunta = {
  resposta?: string;
};

export type SectionDataMap = {
  identificacao: ExperienciaIdentificacao;
  historia_objetivos: ExperienciaHistoriaObjetivos;
  cuidados: ExperienciaCuidados;
  preferencias: ExperienciaPreferencias;
  gastronomia: ExperienciaGastronomia;
  preparacao_viagem: ExperienciaPreparacaoViagem;
  networking: ExperienciaNetworking;
  indicacoes: ExperienciaIndicacoes;
  ultima_pergunta: ExperienciaUltimaPergunta;
};

export type ParticipantResponse = {
  id: string;
  participant_id: string;
  secoes_concluidas: SecoesConcluidas;
  status: "nao_iniciado" | "em_andamento" | "concluido";
  created_at: string;
  updated_at: string;
} & SectionDataMap;

export type SectionMeta = {
  key: SectionKey;
  numero: number;
  titulo: string;
  subtitulo: string;
  /** Campos obrigatórios para a seção virar "concluída" automaticamente.
   * Nenhuma seção tem obrigatórios hoje (os dados obrigatórios de identificação
   * e contato de emergência já vêm de china.matteracademy.ai/formulario) —
   * todas usam a regra "todos os campos preenchidos OU marcada manualmente". */
  camposObrigatorios: string[];
};

export const SECTIONS: SectionMeta[] = [
  { key: "identificacao", numero: 1, titulo: "Identificação", subtitulo: "Sobre você.", camposObrigatorios: [] },
  { key: "historia_objetivos", numero: 2, titulo: "Sua história e seus objetivos", subtitulo: "O que traz você até aqui.", camposObrigatorios: [] },
  { key: "cuidados", numero: 3, titulo: "Como podemos cuidar melhor de você?", subtitulo: "Cuidado começa em ouvir.", camposObrigatorios: [] },
  { key: "preferencias", numero: 4, titulo: "Suas preferências pessoais", subtitulo: "O jeito de cada um viajar.", camposObrigatorios: [] },
  { key: "gastronomia", numero: 5, titulo: "Experiência gastronômica", subtitulo: "A mesa como porta de entrada.", camposObrigatorios: [] },
  { key: "preparacao_viagem", numero: 6, titulo: "Preparação da viagem (28.10 a 09.11)", subtitulo: "Onde cada um está na jornada.", camposObrigatorios: [] },
  { key: "networking", numero: 7, titulo: "Conexões e networking", subtitulo: "Quem você quer encontrar por lá.", camposObrigatorios: [] },
  { key: "indicacoes", numero: 8, titulo: "Quem mais deveria estar nessa experiência?", subtitulo: "Indique quem também merece viver isso.", camposObrigatorios: [] },
  { key: "ultima_pergunta", numero: 9, titulo: "Uma última pergunta", subtitulo: "\"Valeu a pena porque...\"", camposObrigatorios: [] },
];

export const emptyParticipantResponseDefaults: SectionDataMap = {
  identificacao: {},
  historia_objetivos: {},
  cuidados: {},
  preferencias: {},
  gastronomia: {},
  preparacao_viagem: {},
  networking: {},
  indicacoes: [],
  ultima_pergunta: {},
};
