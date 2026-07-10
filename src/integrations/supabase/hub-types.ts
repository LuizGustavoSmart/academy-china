export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      custos: {
        Row: {
          categoria: string
          created_at: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string
          ordem: number | null
          tipo: string
          titulo: string
          updated_at: string | null
          valor_fixo: number | null
          valor_variavel: number | null
        }
        Insert: {
          categoria?: string
          created_at?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          tipo?: string
          titulo: string
          updated_at?: string | null
          valor_fixo?: number | null
          valor_variavel?: number | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
          valor_fixo?: number | null
          valor_variavel?: number | null
        }
        Relationships: []
      }
      financeiro_config: {
        Row: {
          cambio: number | null
          id: number
          meta_vagas: number | null
          min_vagas: number | null
          tier_premium: number | null
          tier_standard: number | null
          updated_at: string | null
        }
        Insert: {
          cambio?: number | null
          id?: number
          meta_vagas?: number | null
          min_vagas?: number | null
          tier_premium?: number | null
          tier_standard?: number | null
          updated_at?: string | null
        }
        Update: {
          cambio?: number | null
          id?: number
          meta_vagas?: number | null
          min_vagas?: number | null
          tier_premium?: number | null
          tier_standard?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          cargo: string | null
          cidade: string | null
          created_at: string | null
          empresa: string | null
          id: string
          nome: string
          observacoes: string | null
          ordem: number | null
          passo: number
          responsavel: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cargo?: string | null
          cidade?: string | null
          created_at?: string | null
          empresa?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          ordem?: number | null
          passo?: number
          responsavel?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cargo?: string | null
          cidade?: string | null
          created_at?: string | null
          empresa?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number | null
          passo?: number
          responsavel?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          codigo: string
          corpo: string | null
          created_at: string | null
          etapa: string
          id: string
          meta: string | null
          nota: string | null
          nota_tipo: string | null
          ordem: number | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          codigo: string
          corpo?: string | null
          created_at?: string | null
          etapa: string
          id?: string
          meta?: string | null
          nota?: string | null
          nota_tipo?: string | null
          ordem?: number | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          codigo?: string
          corpo?: string | null
          created_at?: string | null
          etapa?: string
          id?: string
          meta?: string | null
          nota?: string | null
          nota_tipo?: string | null
          ordem?: number | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      participants: {
        Row: {
          alergias: string | null
          cargo: string | null
          cidade: string | null
          contato_emergencia: string | null
          contrato_status: string | null
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          empresa: string | null
          id: string
          medicamentos: string | null
          nome: string
          nome_completo: string | null
          observacoes: string | null
          observacoes_medicas: string | null
          origem: string | null
          pagamento_status: string | null
          passaporte: string | null
          quarto: string | null
          restricoes_alimentares: string | null
          seguro_status: string | null
          status: string | null
          telefone: string | null
          tier: string | null
          updated_at: string | null
          uso_imagem_status: string | null
          valor_pago: number | null
          voo_ida_status: string | null
          voo_volta_status: string | null
        }
        Insert: {
          alergias?: string | null
          cargo?: string | null
          cidade?: string | null
          contato_emergencia?: string | null
          contrato_status?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          medicamentos?: string | null
          nome: string
          nome_completo?: string | null
          observacoes?: string | null
          observacoes_medicas?: string | null
          origem?: string | null
          pagamento_status?: string | null
          passaporte?: string | null
          quarto?: string | null
          restricoes_alimentares?: string | null
          seguro_status?: string | null
          status?: string | null
          telefone?: string | null
          tier?: string | null
          updated_at?: string | null
          uso_imagem_status?: string | null
          valor_pago?: number | null
          voo_ida_status?: string | null
          voo_volta_status?: string | null
        }
        Update: {
          alergias?: string | null
          cargo?: string | null
          cidade?: string | null
          contato_emergencia?: string | null
          contrato_status?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          medicamentos?: string | null
          nome?: string
          nome_completo?: string | null
          observacoes?: string | null
          observacoes_medicas?: string | null
          origem?: string | null
          pagamento_status?: string | null
          passaporte?: string | null
          quarto?: string | null
          restricoes_alimentares?: string | null
          seguro_status?: string | null
          status?: string | null
          telefone?: string | null
          tier?: string | null
          updated_at?: string | null
          uso_imagem_status?: string | null
          valor_pago?: number | null
          voo_ida_status?: string | null
          voo_volta_status?: string | null
        }
        Relationships: []
      }
      pendencias: {
        Row: {
          created_at: string | null
          descricao: string | null
          dono: string | null
          fase: string | null
          id: string
          impacto: string | null
          ordem: number | null
          prioridade: string | null
          status: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          dono?: string | null
          fase?: string | null
          id?: string
          impacto?: string | null
          ordem?: number | null
          prioridade?: string | null
          status?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          dono?: string | null
          fase?: string | null
          id?: string
          impacto?: string | null
          ordem?: number | null
          prioridade?: string | null
          status?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      touchpoints: {
        Row: {
          id: string
          participant_id: string
          status: string
          touchpoint_code: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          participant_id: string
          status?: string
          touchpoint_code: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          participant_id?: string
          status?: string
          touchpoint_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "touchpoints_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
