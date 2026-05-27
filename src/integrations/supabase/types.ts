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
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          jeweller_id: string
          key_hash: string
          label: string | null
          last_used_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          jeweller_id: string
          key_hash: string
          label?: string | null
          last_used_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          jeweller_id?: string
          key_hash?: string
          label?: string | null
          last_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_jeweller_id_fkey"
            columns: ["jeweller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_profiles: {
        Row: {
          bio: string | null
          created_at: string
          featured: boolean
          gia_member: boolean | null
          id: string
          igi_member: boolean | null
          languages: string[] | null
          logo_url: string | null
          response_time_hours: number | null
          slug: string
          specialities: string[] | null
          years_trading: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          featured?: boolean
          gia_member?: boolean | null
          id: string
          igi_member?: boolean | null
          languages?: string[] | null
          logo_url?: string | null
          response_time_hours?: number | null
          slug: string
          specialities?: string[] | null
          years_trading?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          featured?: boolean
          gia_member?: boolean | null
          id?: string
          igi_member?: boolean | null
          languages?: string[] | null
          logo_url?: string | null
          response_time_hours?: number | null
          slug?: string
          specialities?: string[] | null
          years_trading?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dealer_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          created_at: string
          from_jeweller_id: string
          id: string
          message: string
          status: string
          stone_id: string | null
          subject: string | null
          to_dealer_id: string
        }
        Insert: {
          created_at?: string
          from_jeweller_id: string
          id?: string
          message: string
          status?: string
          stone_id?: string | null
          subject?: string | null
          to_dealer_id: string
        }
        Update: {
          created_at?: string
          from_jeweller_id?: string
          id?: string
          message?: string
          status?: string
          stone_id?: string | null
          subject?: string | null
          to_dealer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_from_jeweller_id_fkey"
            columns: ["from_jeweller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_stone_id_fkey"
            columns: ["stone_id"]
            isOneToOne: false
            referencedRelation: "stones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_to_dealer_id_fkey"
            columns: ["to_dealer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_messages: {
        Row: {
          created_at: string
          enquiry_id: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          enquiry_id: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string
          enquiry_id?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_messages_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_selections: {
        Row: {
          api_key_id: string
          created_at: string
          dealer_id: string | null
          id: string
          markup_override: number | null
          selection_type: string
          stone_id: string | null
        }
        Insert: {
          api_key_id: string
          created_at?: string
          dealer_id?: string | null
          id?: string
          markup_override?: number | null
          selection_type: string
          stone_id?: string | null
        }
        Update: {
          api_key_id?: string
          created_at?: string
          dealer_id?: string | null
          id?: string
          markup_override?: number | null
          selection_type?: string
          stone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_selections_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_selections_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_selections_stone_id_fkey"
            columns: ["stone_id"]
            isOneToOne: false
            referencedRelation: "stones"
            referencedColumns: ["id"]
          },
        ]
      }
      jeweller_profiles: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          markup_global: number
          website: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id: string
          markup_global?: number
          website?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          markup_global?: number
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jeweller_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_approved: boolean
          is_verified: boolean
          phone: string | null
          website: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_approved?: boolean
          is_verified?: boolean
          phone?: string | null
          website?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean
          is_verified?: boolean
          phone?: string | null
          website?: string | null
        }
        Relationships: []
      }
      stone_images: {
        Row: {
          id: string
          is_primary: boolean
          sort_order: number
          stone_id: string
          storage_url: string
        }
        Insert: {
          id?: string
          is_primary?: boolean
          sort_order?: number
          stone_id: string
          storage_url: string
        }
        Update: {
          id?: string
          is_primary?: boolean
          sort_order?: number
          stone_id?: string
          storage_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "stone_images_stone_id_fkey"
            columns: ["stone_id"]
            isOneToOne: false
            referencedRelation: "stones"
            referencedColumns: ["id"]
          },
        ]
      }
      stones: {
        Row: {
          available_qty: number
          carat_weight: number | null
          cert_lab: string | null
          cert_number: string | null
          cert_url: string | null
          clarity_grade: string | null
          colour_grade: string | null
          colour_hue: string | null
          colour_saturation: string | null
          colour_tone: string | null
          country_of_origin: string | null
          created_at: string
          cut_grade: string | null
          dealer_id: string
          featured: boolean
          fluorescence: string | null
          id: string
          lead_time_days: number | null
          origin: string | null
          polish: string | null
          report_date: string | null
          shape: string | null
          status: Database["public"]["Enums"]["stone_status"]
          stone_type: string
          symmetry: string | null
          treatment: string | null
          updated_at: string
          video_url: string | null
          wholesale_price_usd: number | null
        }
        Insert: {
          available_qty?: number
          carat_weight?: number | null
          cert_lab?: string | null
          cert_number?: string | null
          cert_url?: string | null
          clarity_grade?: string | null
          colour_grade?: string | null
          colour_hue?: string | null
          colour_saturation?: string | null
          colour_tone?: string | null
          country_of_origin?: string | null
          created_at?: string
          cut_grade?: string | null
          dealer_id: string
          featured?: boolean
          fluorescence?: string | null
          id?: string
          lead_time_days?: number | null
          origin?: string | null
          polish?: string | null
          report_date?: string | null
          shape?: string | null
          status?: Database["public"]["Enums"]["stone_status"]
          stone_type: string
          symmetry?: string | null
          treatment?: string | null
          updated_at?: string
          video_url?: string | null
          wholesale_price_usd?: number | null
        }
        Update: {
          available_qty?: number
          carat_weight?: number | null
          cert_lab?: string | null
          cert_number?: string | null
          cert_url?: string | null
          clarity_grade?: string | null
          colour_grade?: string | null
          colour_hue?: string | null
          colour_saturation?: string | null
          colour_tone?: string | null
          country_of_origin?: string | null
          created_at?: string
          cut_grade?: string | null
          dealer_id?: string
          featured?: boolean
          fluorescence?: string | null
          id?: string
          lead_time_days?: number | null
          origin?: string | null
          polish?: string | null
          report_date?: string | null
          shape?: string | null
          status?: Database["public"]["Enums"]["stone_status"]
          stone_type?: string
          symmetry?: string | null
          treatment?: string | null
          updated_at?: string
          video_url?: string | null
          wholesale_price_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stones_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "dealer" | "jeweller" | "admin"
      app_role: "admin" | "moderator" | "user"
      stone_status: "available" | "reserved" | "sold"
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
    Enums: {
      account_type: ["dealer", "jeweller", "admin"],
      app_role: ["admin", "moderator", "user"],
      stone_status: ["available", "reserved", "sold"],
    },
  },
} as const
