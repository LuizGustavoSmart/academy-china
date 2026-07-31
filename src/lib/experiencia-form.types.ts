// Tipos e metadados do Formulário de Experiência do Participante (10 seções).
// As 10 colunas jsonb abaixo espelham exatamente `public.participant_responses`.

export type SectionKey =
  | "identificacao"
  | "historia_objetivos"
  | "cuidados"
  | "preferencias"
  | "gastronomia"
  | "preparacao_viagem"
  | "networking"
  | "indicacoes"
  | "ultima_pergunta"
  | "contato_emergencia";

export type SecaoStatus = "nao_iniciada" | "em_andamento" | "concluida";
export type SecoesConcluidas = Partial<Record<SectionKey, SecaoStatus>>;

export type ExperienciaIdentificacao = {
  nome_completo?: string;
  nome_preferido?: string;
  empresa?: string;
  cargo?: string;
  cidade_estado?: string;
  data_nascimento?: string;
  telefone?: string;
  email?: string;
  idiomas?: string[];
  idiomas_outro?: string;
};

export type ExperienciaHistoriaObjetivos = {
  motivacao?: string;
  transformacao_esperada?: string;
  temas_interesse?: string[];
  temas_interesse_outro?: string;
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
  gosta_muito?: string[];
  gosta_muito_outro?: string;
  prefere_evitar?: string[];
  prefere_evitar_outro?: string;
  momentos_livres?: "reservada" | "sociavel" | "depende";
};

export type ExperienciaGastronomia = {
  restricao_alimentar?: "sim" | "nao";
  restricao_alimentar_qual?: string;
  alergia_alimentar?: "sim" | "nao";
  alergia_alimentar_qual?: string;
  alimento_evita?: string;
  alimento_religioso_cultural?: string;
  comidas_interesse?: string[];
  comidas_interesse_outro?: string;
  experiencia_gastronomica_especifica?: string;
};

export type ExperienciaPreparacaoViagem = {
  cotacao_seguro?: "sim" | "ainda_nao" | "apoio_equipe";
  contratou_seguro?: "sim" | "nao";
  cotacao_passagem?: "sim" | "ainda_nao" | "apoio_equipe";
  passagem_emitida?: "sim" | "nao";
  passaporte_validade?: string;
  itinerario_retorno?: "definido" | "apoio_equipe";
  companhia_viagem?: "sozinho" | "acompanhante_negocio" | "acompanhante_social";
  tamanho_camisa?: "PP" | "P" | "M" | "G" | "GG" | "XG";
  preocupacao_reconhecimento_facial?: "sem_preocupacao" | "checkin_tradicional" | "quero_saber_mais";
  autorizacao_uso_imagem?: "autorizo" | "autorizo_com_restricoes" | "nao_autorizo";
  autorizacao_uso_imagem_detalhe?: string;
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

export type ExperienciaContatoEmergencia = {
  nome?: string;
  parentesco?: string;
  telefone?: string;
  email?: string;
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
  contato_emergencia: ExperienciaContatoEmergencia;
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
   * Seções sem obrigatórios (2–9) usam a regra "todos os campos preenchidos
   * OU marcada manualmente" — ver useSectionCompletion. */
  camposObrigatorios: string[];
};

export const SECTIONS: SectionMeta[] = [
  { key: "identificacao", numero: 1, titulo: "Identificação", subtitulo: "Sobre você.", camposObrigatorios: ["nome_completo", "empresa", "cargo", "telefone", "email"] },
  { key: "historia_objetivos", numero: 2, titulo: "Sua história e seus objetivos", subtitulo: "O que traz você até aqui.", camposObrigatorios: [] },
  { key: "cuidados", numero: 3, titulo: "Como podemos cuidar melhor de você?", subtitulo: "Cuidado começa em ouvir.", camposObrigatorios: [] },
  { key: "preferencias", numero: 4, titulo: "Suas preferências pessoais", subtitulo: "O jeito de cada um viajar.", camposObrigatorios: [] },
  { key: "gastronomia", numero: 5, titulo: "Experiência gastronômica", subtitulo: "A mesa como porta de entrada.", camposObrigatorios: [] },
  { key: "preparacao_viagem", numero: 6, titulo: "Preparação da viagem (28.10 a 09.11)", subtitulo: "Onde cada um está na jornada.", camposObrigatorios: [] },
  { key: "networking", numero: 7, titulo: "Conexões e networking", subtitulo: "Quem você quer encontrar por lá.", camposObrigatorios: [] },
  { key: "indicacoes", numero: 8, titulo: "Quem mais deveria estar nessa experiência?", subtitulo: "Indique quem também merece viver isso.", camposObrigatorios: [] },
  { key: "ultima_pergunta", numero: 9, titulo: "Uma última pergunta", subtitulo: "\"Valeu a pena porque...\"", camposObrigatorios: [] },
  { key: "contato_emergencia", numero: 10, titulo: "Contato de emergência", subtitulo: "Um contato de segurança, sempre.", camposObrigatorios: ["nome", "parentesco", "telefone"] },
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
  contato_emergencia: {},
};
