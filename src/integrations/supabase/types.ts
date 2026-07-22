export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      financeiro_config: {
        Row: {
          cambio: number
          created_at: string
          custo_hoteis_max: number
          custo_hoteis_min: number
          custo_interpretes_max: number
          custo_interpretes_min: number
          custo_jantares_max: number
          custo_jantares_min: number
          custo_parceiro_max: number
          custo_parceiro_min: number
          custo_transporte_max: number
          custo_transporte_min: number
          custo_videomaker_max: number
          custo_videomaker_min: number
          id: number
          meta_vagas: number
          min_vagas: number
          tier_premium: number
          tier_standard: number
          updated_at: string
        }
        Insert: {
          cambio?: number
          created_at?: string
          custo_hoteis_max?: number
          custo_hoteis_min?: number
          custo_interpretes_max?: number
          custo_interpretes_min?: number
          custo_jantares_max?: number
          custo_jantares_min?: number
          custo_parceiro_max?: number
          custo_parceiro_min?: number
          custo_transporte_max?: number
          custo_transporte_min?: number
          custo_videomaker_max?: number
          custo_videomaker_min?: number
          id: number
          meta_vagas?: number
          min_vagas?: number
          tier_premium?: number
          tier_standard?: number
          updated_at?: string
        }
        Update: {
          cambio?: number
          created_at?: string
          custo_hoteis_max?: number
          custo_hoteis_min?: number
          custo_interpretes_max?: number
          custo_interpretes_min?: number
          custo_jantares_max?: number
          custo_jantares_min?: number
          custo_parceiro_max?: number
          custo_parceiro_min?: number
          custo_transporte_max?: number
          custo_transporte_min?: number
          custo_videomaker_max?: number
          custo_videomaker_min?: number
          id?: number
          meta_vagas?: number
          min_vagas?: number
          tier_premium?: number
          tier_standard?: number
          updated_at?: string
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          autor: string | null
          conteudo: string
          created_at: string
          id: string
          lead_id: string
          tipo: string
        }
        Insert: {
          autor?: string | null
          conteudo: string
          created_at?: string
          id?: string
          lead_id: string
          tipo?: string
        }
        Update: {
          autor?: string | null
          conteudo?: string
          created_at?: string
          id?: string
          lead_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_crm"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_responsaveis: {
        Row: {
          created_at: string
          lead_id: string
          responsavel_id: string
        }
        Insert: {
          created_at?: string
          lead_id: string
          responsavel_id: string
        }
        Update: {
          created_at?: string
          lead_id?: string
          responsavel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_responsaveis_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_responsaveis_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          empresa: string | null
          id: string
          ip: string | null
          mensagem: string | null
          nome: string | null
          origem: string | null
          telefone: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          empresa?: string | null
          id?: string
          ip?: string | null
          mensagem?: string | null
          nome?: string | null
          origem?: string | null
          telefone?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          empresa?: string | null
          id?: string
          ip?: string | null
          mensagem?: string | null
          nome?: string | null
          origem?: string | null
          telefone?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      leads_crm: {
        Row: {
          cadastrado_por: string | null
          cargo: string | null
          cidade: string | null
          created_at: string
          email: string | null
          empresa: string | null
          id: string
          ip: string | null
          mensagem: string | null
          nome: string
          observacoes: string | null
          ordem: number
          origem: string | null
          passo: number
          responsavel: string
          status: string | null
          telefone: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          cadastrado_por?: string | null
          cargo?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          empresa?: string | null
          id?: string
          ip?: string | null
          mensagem?: string | null
          nome: string
          observacoes?: string | null
          ordem?: number
          origem?: string | null
          passo?: number
          responsavel: string
          status?: string | null
          telefone?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          cadastrado_por?: string | null
          cargo?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          empresa?: string | null
          id?: string
          ip?: string | null
          mensagem?: string | null
          nome?: string
          observacoes?: string | null
          ordem?: number
          origem?: string | null
          passo?: number
          responsavel?: string
          status?: string | null
          telefone?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          codigo: string
          corpo: string | null
          created_at: string
          etapa: string
          id: string
          meta: string | null
          nota: string | null
          nota_tipo: string | null
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          codigo: string
          corpo?: string | null
          created_at?: string
          etapa: string
          id?: string
          meta?: string | null
          nota?: string | null
          nota_tipo?: string | null
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          corpo?: string | null
          created_at?: string
          etapa?: string
          id?: string
          meta?: string | null
          nota?: string | null
          nota_tipo?: string | null
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      participant_activities: {
        Row: {
          autor: string | null
          conteudo: string
          created_at: string
          id: string
          participant_id: string
          tipo: string
        }
        Insert: {
          autor?: string | null
          conteudo: string
          created_at?: string
          id?: string
          participant_id: string
          tipo?: string
        }
        Update: {
          autor?: string | null
          conteudo?: string
          created_at?: string
          id?: string
          participant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_activities_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          alergias: string | null
          areas_interesse: string | null
          cargo: string | null
          cidade: string | null
          contato_emergencia: string | null
          contrato_status: string
          created_at: string
          data_nascimento: string | null
          email: string | null
          empresa: string | null
          empresa_perfil: string | null
          empresa_site: string | null
          form_id: string | null
          form_synced_at: string | null
          foto_url: string | null
          id: string
          medicamentos: string | null
          nacionalidade: string | null
          nome: string
          nome_completo: string | null
          observacoes: string | null
          observacoes_medicas: string | null
          origem: string | null
          pagamento_status: string
          passaporte: string | null
          passaporte_emissao: string | null
          passaporte_validade: string | null
          quarto: string | null
          restricoes_alimentares: string | null
          seguro_status: string
          status: string
          tamanho_blazer: string | null
          tamanho_camisa: string | null
          telefone: string | null
          tier: string
          tipo_sanguineo: string | null
          updated_at: string
          uso_imagem_status: string
          valor_pago: number
          voo_detalhes: Json | null
          voo_volta_detalhes: Json | null
          voo_ida_status: string
          voo_volta_status: string
        }
        Insert: {
          alergias?: string | null
          areas_interesse?: string | null
          cargo?: string | null
          cidade?: string | null
          contato_emergencia?: string | null
          contrato_status?: string
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa?: string | null
          empresa_perfil?: string | null
          empresa_site?: string | null
          form_id?: string | null
          form_synced_at?: string | null
          foto_url?: string | null
          id?: string
          medicamentos?: string | null
          nacionalidade?: string | null
          nome: string
          nome_completo?: string | null
          observacoes?: string | null
          observacoes_medicas?: string | null
          origem?: string | null
          pagamento_status?: string
          passaporte?: string | null
          passaporte_emissao?: string | null
          passaporte_validade?: string | null
          quarto?: string | null
          restricoes_alimentares?: string | null
          seguro_status?: string
          status?: string
          tamanho_blazer?: string | null
          tamanho_camisa?: string | null
          telefone?: string | null
          tier?: string
          tipo_sanguineo?: string | null
          updated_at?: string
          uso_imagem_status?: string
          valor_pago?: number
          voo_detalhes?: Json | null
          voo_volta_detalhes?: Json | null
          voo_ida_status?: string
          voo_volta_status?: string
        }
        Update: {
          alergias?: string | null
          areas_interesse?: string | null
          cargo?: string | null
          cidade?: string | null
          contato_emergencia?: string | null
          contrato_status?: string
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa?: string | null
          empresa_perfil?: string | null
          empresa_site?: string | null
          form_id?: string | null
          form_synced_at?: string | null
          foto_url?: string | null
          id?: string
          medicamentos?: string | null
          nacionalidade?: string | null
          nome?: string
          nome_completo?: string | null
          observacoes?: string | null
          observacoes_medicas?: string | null
          origem?: string | null
          pagamento_status?: string
          passaporte?: string | null
          passaporte_emissao?: string | null
          passaporte_validade?: string | null
          quarto?: string | null
          restricoes_alimentares?: string | null
          seguro_status?: string
          status?: string
          tamanho_blazer?: string | null
          tamanho_camisa?: string | null
          telefone?: string | null
          tier?: string
          tipo_sanguineo?: string | null
          updated_at?: string
          uso_imagem_status?: string
          valor_pago?: number
          voo_detalhes?: Json | null
          voo_volta_detalhes?: Json | null
          voo_ida_status?: string
          voo_volta_status?: string
        }
        Relationships: []
      }
      pendencias: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          dono: string | null
          fase: string | null
          id: string
          impacto: string | null
          ordem: number
          prioridade: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          dono?: string | null
          fase?: string | null
          id?: string
          impacto?: string | null
          ordem?: number
          prioridade?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          dono?: string | null
          fase?: string | null
          id?: string
          impacto?: string | null
          ordem?: number
          prioridade?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      responsaveis: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      touchpoints: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          status: string
          touchpoint_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          status?: string
          touchpoint_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_id?: string
          status?: string
          touchpoint_code?: string
          updated_at?: string
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
      replace_lead_responsaveis: {
        Args: { p_lead_id: string; p_responsavel_ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
