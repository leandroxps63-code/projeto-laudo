// GERADO AUTOMATICAMENTE a partir do projeto Supabase "projeto-laudo-dev" em 14/09/2026.
// Não editar à mão — regenerar via Supabase MCP (generate_typescript_types) ou
// `supabase gen types typescript` sempre que a migration mudar.

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
      anomalies: {
        Row: {
          catalog_id: string | null
          code: string | null
          created_at: string
          created_by: string
          description: string
          environment: string
          id: string
          inspection_id: string
          severity: string
          system_type: string
          treatment_recommendation: string
        }
        Insert: {
          catalog_id?: string | null
          code?: string | null
          created_at?: string
          created_by: string
          description: string
          environment: string
          id?: string
          inspection_id: string
          severity: string
          system_type: string
          treatment_recommendation: string
        }
        Update: {
          catalog_id?: string | null
          code?: string | null
          created_at?: string
          created_by?: string
          description?: string
          environment?: string
          id?: string
          inspection_id?: string
          severity?: string
          system_type?: string
          treatment_recommendation?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomalies_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "anomaly_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_catalog: {
        Row: {
          category: string
          created_at: string
          default_severity: string
          description: string
          id: string
          system_type: string
          treatment_recommendation: string
        }
        Insert: {
          category: string
          created_at?: string
          default_severity: string
          description: string
          id?: string
          system_type: string
          treatment_recommendation: string
        }
        Update: {
          category?: string
          created_at?: string
          default_severity?: string
          description?: string
          id?: string
          system_type?: string
          treatment_recommendation?: string
        }
        Relationships: []
      }
      anomaly_photos: {
        Row: {
          anomaly_id: string
          caption: string | null
          created_at: string
          id: string
          storage_path: string
        }
        Insert: {
          anomaly_id: string
          caption?: string | null
          created_at?: string
          id?: string
          storage_path: string
        }
        Update: {
          anomaly_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_photos_anomaly_id_fkey"
            columns: ["anomaly_id"]
            isOneToOne: false
            referencedRelation: "anomalies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          profile_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string
          client_id: string
          created_at: string
          floors: number | null
          id: string
          name: string
        }
        Insert: {
          address: string
          client_id: string
          created_at?: string
          floors?: number | null
          id?: string
          name: string
        }
        Update: {
          address?: string
          client_id?: string
          created_at?: string
          floors?: number | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_products: {
        Row: {
          anomaly_catalog_id: string
          created_at: string
          datasheet_url: string | null
          id: string
          manufacturer: string
          product_name: string
          video_url: string | null
        }
        Insert: {
          anomaly_catalog_id: string
          created_at?: string
          datasheet_url?: string | null
          id?: string
          manufacturer: string
          product_name: string
          video_url?: string | null
        }
        Update: {
          anomaly_catalog_id?: string
          created_at?: string
          datasheet_url?: string | null
          id?: string
          manufacturer?: string
          product_name?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_products_anomaly_catalog_id_fkey"
            columns: ["anomaly_catalog_id"]
            isOneToOne: false
            referencedRelation: "anomaly_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_log: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string
          profile_id: string | null
          source: string
          stack: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message: string
          profile_id?: string | null
          source: string
          stack?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string
          profile_id?: string | null
          source?: string
          stack?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_members: {
        Row: {
          inspection_id: string
          profile_id: string
          role_on_inspection: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          inspection_id: string
          profile_id: string
          role_on_inspection: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          inspection_id?: string
          profile_id?: string
          role_on_inspection?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "inspection_members_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          building_id: string
          created_at: string
          finished_at: string | null
          id: string
          inspection_type: string
          responsible_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["inspection_status"]
        }
        Insert: {
          building_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          inspection_type?: string
          responsible_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
        }
        Update: {
          building_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          inspection_type?: string
          responsible_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "inspections_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string | null
          cpf: string | null
          crea: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          birth_date?: string | null
          cpf?: string | null
          crea?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          birth_date?: string | null
          cpf?: string | null
          crea?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      reports: {
        Row: {
          art_number: string | null
          created_at: string
          created_by: string
          excel_url: string | null
          generated_at: string | null
          id: string
          inspection_id: string
          pdf_url: string | null
          report_number: string
          share_enabled: boolean
          share_token: string
          status: Database["public"]["Enums"]["report_status"]
          version: number
        }
        Insert: {
          art_number?: string | null
          created_at?: string
          created_by: string
          excel_url?: string | null
          generated_at?: string | null
          id?: string
          inspection_id: string
          pdf_url?: string | null
          report_number: string
          share_enabled?: boolean
          share_token?: string
          status?: Database["public"]["Enums"]["report_status"]
          version?: number
        }
        Update: {
          art_number?: string | null
          created_at?: string
          created_by?: string
          excel_url?: string | null
          generated_at?: string | null
          id?: string
          inspection_id?: string
          pdf_url?: string | null
          report_number?: string
          share_enabled?: boolean
          share_token?: string
          status?: Database["public"]["Enums"]["report_status"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_shared_report: {
        Args: { p_token: string }
        Returns: {
          art_number: string
          building_address: string
          building_name: string
          created_at: string
          excel_path: string
          generated_at: string
          id: string
          pdf_path: string
          report_number: string
          status: Database["public"]["Enums"]["report_status"]
          version: number
        }[]
      }
    }
    Enums: {
      inspection_status: "rascunho" | "em_vistoria" | "concluida"
      report_status: "rascunho" | "gerado" | "entregue"
      user_role: "responsavel_tecnico" | "assistente" | "sindico"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      inspection_status: ["rascunho", "em_vistoria", "concluida"],
      report_status: ["rascunho", "gerado", "entregue"],
      user_role: ["responsavel_tecnico", "assistente", "sindico"],
    },
  },
} as const
