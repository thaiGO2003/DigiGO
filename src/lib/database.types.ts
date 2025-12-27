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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bank_configs: {
        Row: {
          account_name: string
          account_number: string
          bank_id: string
          bank_name: string
          created_at: string
          id: string
          is_active: boolean | null
          napas_code: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_id: string
          bank_name: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          napas_code?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_id?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          napas_code?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          admin_id: string | null
          created_at: string | null
          id: string
          is_admin: boolean | null
          message: string
          user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message: string
          user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      product_keys: {
        Row: {
          created_at: string | null
          id: string
          is_used: boolean | null
          key_value: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          key_value: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          key_value?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_keys_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string | null
          description: string | null
          discount_percent: number | null
          duration_days: number | null
          guide_url: string | null
          id: string
          is_manual_delivery: boolean | null
          manual_stock: number | null
          name: string
          price: number
          product_id: string | null
          sort_order: number | null
          total_sold: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          duration_days?: number | null
          guide_url?: string | null
          id?: string
          is_manual_delivery?: boolean | null
          manual_stock?: number | null
          name: string
          price: number
          product_id?: string | null
          sort_order?: number | null
          total_sold?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          duration_days?: number | null
          guide_url?: string | null
          id?: string
          is_manual_delivery?: boolean | null
          manual_stock?: number | null
          name?: string
          price?: number
          product_id?: string | null
          sort_order?: number | null
          total_sold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          guide_url: string | null
          id: string
          image_url: string | null
          is_hot: boolean | null
          mechanism: string | null
          name: string
          recommended_model: string | null
          sort_order: number | null
          strengths: string | null
          variant_sort_strategy: string | null
          weaknesses: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          guide_url?: string | null
          id?: string
          image_url?: string | null
          is_hot?: boolean | null
          mechanism?: string | null
          name: string
          recommended_model?: string | null
          sort_order?: number | null
          strengths?: string | null
          variant_sort_strategy?: string | null
          weaknesses?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          guide_url?: string | null
          id?: string
          image_url?: string | null
          is_hot?: boolean | null
          mechanism?: string | null
          name?: string
          recommended_model?: string | null
          sort_order?: number | null
          strengths?: string | null
          variant_sort_strategy?: string | null
          weaknesses?: string | null
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          referred_user_id: string | null
          referrer_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          referred_user_id?: string | null
          referrer_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          referred_user_id?: string | null
          referrer_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_earnings_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          key_id: string | null
          metadata: Json | null
          status: string | null
          type: string
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          key_id?: string | null
          metadata?: Json | null
          status?: string | null
          type: string
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          key_id?: string | null
          metadata?: Json | null
          status?: string | null
          type?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "product_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          balance: number | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          is_banned: boolean | null
          last_username_change: string | null
          rank: string | null
          referral_code: string | null
          referred_by: string | null
          total_deposited: number | null
          username: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_banned?: boolean | null
          last_username_change?: string | null
          rank?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_deposited?: number | null
          username?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_banned?: boolean | null
          last_username_change?: string | null
          rank?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_deposited?: number | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance: {
        Args: { p_amount: number; p_note?: string; p_user_id: string }
        Returns: Json
      }
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_toggle_ban_user: {
        Args: { p_status: boolean; p_user_id: string }
        Returns: undefined
      }
      check_referral_code: { Args: { p_code: string }; Returns: boolean }
      check_username_exists: { Args: { p_username: string }; Returns: boolean }
      delete_own_account: { Args: never; Returns: undefined }
      delete_user_completely: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      ensure_user_profile_exists: { Args: never; Returns: Json }
      get_email_by_identity: { Args: { p_identity: string }; Returns: string }
      get_notification_entities: { Args: never; Returns: Json }
      get_products_with_variants: { Args: never; Returns: Json }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      purchase_product:
        | { Args: { p_user_id: string; p_variant_id: string }; Returns: Json }
        | {
            Args: {
              p_quantity?: number
              p_user_id: string
              p_variant_id: string
            }
            Returns: Json
          }
      set_referrer: {
        Args: { p_referral_code: string; p_user_id: string }
        Returns: Json
      }
      update_full_name: { Args: { p_full_name: string }; Returns: Json }
      update_username: { Args: { p_new_username: string }; Returns: Json }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
