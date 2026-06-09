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
          key_prefix: string | null
          key_type: string
          label: string | null
          last_used_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          jeweller_id: string
          key_hash: string
          key_prefix?: string | null
          key_type?: string
          label?: string | null
          last_used_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          jeweller_id?: string
          key_hash?: string
          key_prefix?: string | null
          key_type?: string
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
      dealer_follows: {
        Row: {
          created_at: string
          dealer_id: string
          id: string
          jeweller_id: string
        }
        Insert: {
          created_at?: string
          dealer_id: string
          id?: string
          jeweller_id: string
        }
        Update: {
          created_at?: string
          dealer_id?: string
          id?: string
          jeweller_id?: string
        }
        Relationships: []
      }
      dealer_profiles: {
        Row: {
          auto_sync_enabled: boolean
          bio: string | null
          certifications: string[] | null
          cover_image_url: string | null
          created_at: string
          default_currency: string
          directory_url: string | null
          external_feed_body: string | null
          external_feed_method: string
          external_feed_url: string | null
          featured: boolean
          founded_year: number | null
          gia_member: boolean | null
          id: string
          igi_member: boolean | null
          instagram_url: string | null
          languages: string[] | null
          last_synced_at: string | null
          logo_url: string | null
          response_time_hours: number | null
          slug: string
          specialities: string[] | null
          story: string | null
          tagline: string | null
          trade_memberships: string[] | null
          years_trading: number | null
        }
        Insert: {
          auto_sync_enabled?: boolean
          bio?: string | null
          certifications?: string[] | null
          cover_image_url?: string | null
          created_at?: string
          default_currency?: string
          directory_url?: string | null
          external_feed_body?: string | null
          external_feed_method?: string
          external_feed_url?: string | null
          featured?: boolean
          founded_year?: number | null
          gia_member?: boolean | null
          id: string
          igi_member?: boolean | null
          instagram_url?: string | null
          languages?: string[] | null
          last_synced_at?: string | null
          logo_url?: string | null
          response_time_hours?: number | null
          slug: string
          specialities?: string[] | null
          story?: string | null
          tagline?: string | null
          trade_memberships?: string[] | null
          years_trading?: number | null
        }
        Update: {
          auto_sync_enabled?: boolean
          bio?: string | null
          certifications?: string[] | null
          cover_image_url?: string | null
          created_at?: string
          default_currency?: string
          directory_url?: string | null
          external_feed_body?: string | null
          external_feed_method?: string
          external_feed_url?: string | null
          featured?: boolean
          founded_year?: number | null
          gia_member?: boolean | null
          id?: string
          igi_member?: boolean | null
          instagram_url?: string | null
          languages?: string[] | null
          last_synced_at?: string | null
          logo_url?: string | null
          response_time_hours?: number | null
          slug?: string
          specialities?: string[] | null
          story?: string | null
          tagline?: string | null
          trade_memberships?: string[] | null
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
          display_currency: string
          feed_currency: string
          founded_year: number | null
          id: string
          instagram_url: string | null
          is_public: boolean
          logo_url: string | null
          markup_global: number
          primary_interests: string[] | null
          primary_market: string | null
          slug: string | null
          sourcing_method: string | null
          specialities: string[] | null
          tagline: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_currency?: string
          feed_currency?: string
          founded_year?: number | null
          id: string
          instagram_url?: string | null
          is_public?: boolean
          logo_url?: string | null
          markup_global?: number
          primary_interests?: string[] | null
          primary_market?: string | null
          slug?: string | null
          sourcing_method?: string | null
          specialities?: string[] | null
          tagline?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_currency?: string
          feed_currency?: string
          founded_year?: number | null
          id?: string
          instagram_url?: string | null
          is_public?: boolean
          logo_url?: string | null
          markup_global?: number
          primary_interests?: string[] | null
          primary_market?: string | null
          slug?: string | null
          sourcing_method?: string | null
          specialities?: string[] | null
          tagline?: string | null
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
      orders: {
        Row: {
          carrier: string | null
          created_at: string
          dealer_id: string
          enquiry_id: string | null
          expected_delivery: string | null
          fee_invoiced_at: string | null
          fee_paid_at: string | null
          id: string
          jeweller_confirmed_receipt: boolean | null
          jeweller_id: string
          jeweller_notes: string | null
          notes: string | null
          platform_fee_amount: number | null
          platform_fee_currency: string | null
          platform_fee_usd: number | null
          received_at: string | null
          sale_date: string
          shipping_status: string | null
          stone_id: string | null
          tracking_number: string | null
          wholesale_price_usd: number | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          dealer_id: string
          enquiry_id?: string | null
          expected_delivery?: string | null
          fee_invoiced_at?: string | null
          fee_paid_at?: string | null
          id?: string
          jeweller_confirmed_receipt?: boolean | null
          jeweller_id: string
          jeweller_notes?: string | null
          notes?: string | null
          platform_fee_amount?: number | null
          platform_fee_currency?: string | null
          platform_fee_usd?: number | null
          received_at?: string | null
          sale_date?: string
          shipping_status?: string | null
          stone_id?: string | null
          tracking_number?: string | null
          wholesale_price_usd?: number | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          dealer_id?: string
          enquiry_id?: string | null
          expected_delivery?: string | null
          fee_invoiced_at?: string | null
          fee_paid_at?: string | null
          id?: string
          jeweller_confirmed_receipt?: boolean | null
          jeweller_id?: string
          jeweller_notes?: string | null
          notes?: string | null
          platform_fee_amount?: number | null
          platform_fee_currency?: string | null
          platform_fee_usd?: number | null
          received_at?: string | null
          sale_date?: string
          shipping_status?: string | null
          stone_id?: string | null
          tracking_number?: string | null
          wholesale_price_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_stone_id_fkey"
            columns: ["stone_id"]
            isOneToOne: false
            referencedRelation: "stones"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          created_at: string
          currency: string | null
          dealer_id: string
          id: string
          is_active: boolean
          notes: string | null
          rule_type: string
          scope: string
          stone_id: string | null
          stone_type: string | null
          value: number
        }
        Insert: {
          created_at?: string
          currency?: string | null
          dealer_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          rule_type: string
          scope?: string
          stone_id?: string | null
          stone_type?: string | null
          value: number
        }
        Update: {
          created_at?: string
          currency?: string | null
          dealer_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          rule_type?: string
          scope?: string
          stone_id?: string | null
          stone_type?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_stone_id_fkey"
            columns: ["stone_id"]
            isOneToOne: false
            referencedRelation: "stones"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          account_types: string[] | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_approved: boolean
          is_verified: boolean
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          terms_accepted_at: string | null
          terms_accepted_ip: string | null
          website: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          account_types?: string[] | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_approved?: boolean
          is_verified?: boolean
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          terms_accepted_at?: string | null
          terms_accepted_ip?: string | null
          website?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          account_types?: string[] | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean
          is_verified?: boolean
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          terms_accepted_at?: string | null
          terms_accepted_ip?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_credits: {
        Row: {
          beneficiary_id: string
          created_at: string
          credit_gbp: number
          credit_months: number
          credit_type: string
          cross_side: boolean
          id: string
          qualifying_event: string
          qualifying_event_at: string | null
          reason: string
          referral_id: string | null
          status: string
        }
        Insert: {
          beneficiary_id: string
          created_at?: string
          credit_gbp?: number
          credit_months?: number
          credit_type: string
          cross_side?: boolean
          id?: string
          qualifying_event: string
          qualifying_event_at?: string | null
          reason: string
          referral_id?: string | null
          status?: string
        }
        Update: {
          beneficiary_id?: string
          created_at?: string
          credit_gbp?: number
          credit_months?: number
          credit_type?: string
          cross_side?: boolean
          id?: string
          qualifying_event?: string
          qualifying_event_at?: string | null
          reason?: string
          referral_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_credits_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_credits_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          stone_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          stone_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          stone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_stone_id_fkey"
            columns: ["stone_id"]
            isOneToOne: false
            referencedRelation: "stones"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          dealer_id: string
          id: string
          jeweller_id: string
          rating: number
          stone_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          dealer_id: string
          id?: string
          jeweller_id: string
          rating: number
          stone_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          dealer_id?: string
          id?: string
          jeweller_id?: string
          rating?: number
          stone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_jeweller_id_fkey"
            columns: ["jeweller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_stone_id_fkey"
            columns: ["stone_id"]
            isOneToOne: false
            referencedRelation: "stones"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          jeweller_id: string
          last_notified_at: string | null
          name: string
          notify_daily: boolean
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          jeweller_id: string
          last_notified_at?: string | null
          name: string
          notify_daily?: boolean
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          jeweller_id?: string
          last_notified_at?: string | null
          name?: string
          notify_daily?: boolean
        }
        Relationships: []
      }
      shopify_connections: {
        Row: {
          access_token: string | null
          auto_sync: boolean
          client_id: string | null
          client_secret: string | null
          created_at: string
          encrypted_client_secret: string | null
          id: string
          is_active: boolean
          jeweller_id: string
          last_sync_at: string | null
          last_sync_status: string | null
          products_synced: number
          shop_domain: string
          shop_name: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          auto_sync?: boolean
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          encrypted_client_secret?: string | null
          id?: string
          is_active?: boolean
          jeweller_id: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          products_synced?: number
          shop_domain: string
          shop_name?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          auto_sync?: boolean
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          encrypted_client_secret?: string | null
          id?: string
          is_active?: boolean
          jeweller_id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          products_synced?: number
          shop_domain?: string
          shop_name?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_connections_jeweller_id_fkey"
            columns: ["jeweller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          jeweller_id: string
          shop_domain: string
          state: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          jeweller_id: string
          shop_domain: string
          state: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          jeweller_id?: string
          shop_domain?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_oauth_states_jeweller_id_fkey"
            columns: ["jeweller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_product_map: {
        Row: {
          id: string
          jeweller_id: string
          last_synced_at: string
          shopify_handle: string | null
          shopify_product_id: string
          shopify_product_status: string
          stone_id: string
        }
        Insert: {
          id?: string
          jeweller_id: string
          last_synced_at?: string
          shopify_handle?: string | null
          shopify_product_id: string
          shopify_product_status?: string
          stone_id: string
        }
        Update: {
          id?: string
          jeweller_id?: string
          last_synced_at?: string
          shopify_handle?: string | null
          shopify_product_id?: string
          shopify_product_status?: string
          stone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_product_map_jeweller_id_fkey"
            columns: ["jeweller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_product_map_stone_id_fkey"
            columns: ["stone_id"]
            isOneToOne: false
            referencedRelation: "stones"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_sync_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          jeweller_id: string
          started_at: string
          status: string
          stones_added: number
          stones_archived: number
          stones_updated: number
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          jeweller_id: string
          started_at?: string
          status?: string
          stones_added?: number
          stones_archived?: number
          stones_updated?: number
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          jeweller_id?: string
          started_at?: string
          status?: string
          stones_added?: number
          stones_archived?: number
          stones_updated?: number
        }
        Relationships: [
          {
            foreignKeyName: "shopify_sync_logs_jeweller_id_fkey"
            columns: ["jeweller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_configurations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          theme_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          theme_data?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          theme_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      stone_images: {
        Row: {
          external_image_url: string | null
          id: string
          is_primary: boolean
          sort_order: number
          stone_id: string
          storage_url: string | null
        }
        Insert: {
          external_image_url?: string | null
          id?: string
          is_primary?: boolean
          sort_order?: number
          stone_id: string
          storage_url?: string | null
        }
        Update: {
          external_image_url?: string | null
          id?: string
          is_primary?: boolean
          sort_order?: number
          stone_id?: string
          storage_url?: string | null
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
      stone_request_responses: {
        Row: {
          created_at: string
          dealer_id: string
          id: string
          message: string
          request_id: string
        }
        Insert: {
          created_at?: string
          dealer_id: string
          id?: string
          message: string
          request_id: string
        }
        Update: {
          created_at?: string
          dealer_id?: string
          id?: string
          message?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stone_request_responses_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stone_request_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "stone_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      stone_requests: {
        Row: {
          cert_lab: string | null
          colour_description: string | null
          created_at: string
          expires_at: string
          id: string
          jeweller_id: string
          max_budget_usd: number | null
          max_carat: number | null
          min_carat: number | null
          notes: string | null
          shape: string[] | null
          status: string
          stone_type: string
          treatment: string | null
        }
        Insert: {
          cert_lab?: string | null
          colour_description?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          jeweller_id: string
          max_budget_usd?: number | null
          max_carat?: number | null
          min_carat?: number | null
          notes?: string | null
          shape?: string[] | null
          status?: string
          stone_type: string
          treatment?: string | null
        }
        Update: {
          cert_lab?: string | null
          colour_description?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          jeweller_id?: string
          max_budget_usd?: number | null
          max_carat?: number | null
          min_carat?: number | null
          notes?: string | null
          shape?: string[] | null
          status?: string
          stone_type?: string
          treatment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stone_requests_jeweller_id_fkey"
            columns: ["jeweller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stones: {
        Row: {
          available_qty: number
          black_inclusion: string | null
          bulk_pricing_available: boolean
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
          crown_angle: number | null
          culet_condition: string | null
          culet_size: string | null
          cut_grade: string | null
          dealer_id: string
          depth_pct: number | null
          enhancement: string | null
          external_source: string | null
          external_sync_key: string | null
          eye_clean: string | null
          featured: boolean
          feed_inactive: boolean
          fluorescence: string | null
          fluorescence_colour: string | null
          girdle: string | null
          has_360: boolean
          has_image: boolean
          has_video: boolean
          id: string
          intake_source: string | null
          is_test: boolean
          last_imported_at: string | null
          lead_time_days: number | null
          listing_type: string
          lw_ratio: number | null
          matching_pair: boolean
          measurements_height: number | null
          measurements_length: number | null
          measurements_width: number | null
          milky: string | null
          minimum_order_qty: number
          notes_for_buyers: string | null
          origin: string | null
          origin_lower: string | null
          parcel_quantity: number | null
          pavilion_angle: number | null
          phenomenon: string | null
          polish: string | null
          price_currency: string
          provenance_report: string | null
          raw_import_row: Json | null
          report_date: string | null
          shade: string | null
          shape: string | null
          share_count: number
          source_stock_no: string | null
          status: Database["public"]["Enums"]["stone_status"]
          stone_type: string
          stone_type_lower: string | null
          symmetry: string | null
          table_pct: number | null
          treatment: string | null
          updated_at: string
          video_url: string | null
          view_count: number
          wholesale_price_usd: number | null
        }
        Insert: {
          available_qty?: number
          black_inclusion?: string | null
          bulk_pricing_available?: boolean
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
          crown_angle?: number | null
          culet_condition?: string | null
          culet_size?: string | null
          cut_grade?: string | null
          dealer_id: string
          depth_pct?: number | null
          enhancement?: string | null
          external_source?: string | null
          external_sync_key?: string | null
          eye_clean?: string | null
          featured?: boolean
          feed_inactive?: boolean
          fluorescence?: string | null
          fluorescence_colour?: string | null
          girdle?: string | null
          has_360?: boolean
          has_image?: boolean
          has_video?: boolean
          id?: string
          intake_source?: string | null
          is_test?: boolean
          last_imported_at?: string | null
          lead_time_days?: number | null
          listing_type?: string
          lw_ratio?: number | null
          matching_pair?: boolean
          measurements_height?: number | null
          measurements_length?: number | null
          measurements_width?: number | null
          milky?: string | null
          minimum_order_qty?: number
          notes_for_buyers?: string | null
          origin?: string | null
          origin_lower?: string | null
          parcel_quantity?: number | null
          pavilion_angle?: number | null
          phenomenon?: string | null
          polish?: string | null
          price_currency?: string
          provenance_report?: string | null
          raw_import_row?: Json | null
          report_date?: string | null
          shade?: string | null
          shape?: string | null
          share_count?: number
          source_stock_no?: string | null
          status?: Database["public"]["Enums"]["stone_status"]
          stone_type: string
          stone_type_lower?: string | null
          symmetry?: string | null
          table_pct?: number | null
          treatment?: string | null
          updated_at?: string
          video_url?: string | null
          view_count?: number
          wholesale_price_usd?: number | null
        }
        Update: {
          available_qty?: number
          black_inclusion?: string | null
          bulk_pricing_available?: boolean
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
          crown_angle?: number | null
          culet_condition?: string | null
          culet_size?: string | null
          cut_grade?: string | null
          dealer_id?: string
          depth_pct?: number | null
          enhancement?: string | null
          external_source?: string | null
          external_sync_key?: string | null
          eye_clean?: string | null
          featured?: boolean
          feed_inactive?: boolean
          fluorescence?: string | null
          fluorescence_colour?: string | null
          girdle?: string | null
          has_360?: boolean
          has_image?: boolean
          has_video?: boolean
          id?: string
          intake_source?: string | null
          is_test?: boolean
          last_imported_at?: string | null
          lead_time_days?: number | null
          listing_type?: string
          lw_ratio?: number | null
          matching_pair?: boolean
          measurements_height?: number | null
          measurements_length?: number | null
          measurements_width?: number | null
          milky?: string | null
          minimum_order_qty?: number
          notes_for_buyers?: string | null
          origin?: string | null
          origin_lower?: string | null
          parcel_quantity?: number | null
          pavilion_angle?: number | null
          phenomenon?: string | null
          polish?: string | null
          price_currency?: string
          provenance_report?: string | null
          raw_import_row?: Json | null
          report_date?: string | null
          shade?: string | null
          shape?: string | null
          share_count?: number
          source_stock_no?: string | null
          status?: Database["public"]["Enums"]["stone_status"]
          stone_type?: string
          stone_type_lower?: string | null
          symmetry?: string | null
          table_pct?: number | null
          treatment?: string | null
          updated_at?: string
          video_url?: string | null
          view_count?: number
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
      sync_logs: {
        Row: {
          created_at: string
          dealer_id: string
          errors: Json
          finished_at: string | null
          id: string
          source: string
          started_at: string
          status: string
          stones_added: number
          stones_marked_inactive: number
          stones_updated: number
        }
        Insert: {
          created_at?: string
          dealer_id: string
          errors?: Json
          finished_at?: string | null
          id?: string
          source?: string
          started_at?: string
          status?: string
          stones_added?: number
          stones_marked_inactive?: number
          stones_updated?: number
        }
        Update: {
          created_at?: string
          dealer_id?: string
          errors?: Json
          finished_at?: string | null
          id?: string
          source?: string
          started_at?: string
          status?: string
          stones_added?: number
          stones_marked_inactive?: number
          stones_updated?: number
        }
        Relationships: []
      }
      system_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
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
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      whatsapp_intake_log: {
        Row: {
          confidence: string
          created_at: string
          dealer_id: string
          extracted_json: Json
          id: string
          original_currency: string | null
          processed_at: string | null
          raw_message: string
          raw_price_text: string | null
          status: string
          stone_id: string | null
          warnings: string[]
        }
        Insert: {
          confidence?: string
          created_at?: string
          dealer_id: string
          extracted_json?: Json
          id?: string
          original_currency?: string | null
          processed_at?: string | null
          raw_message: string
          raw_price_text?: string | null
          status?: string
          stone_id?: string | null
          warnings?: string[]
        }
        Update: {
          confidence?: string
          created_at?: string
          dealer_id?: string
          extracted_json?: Json
          id?: string
          original_currency?: string | null
          processed_at?: string | null
          raw_message?: string
          raw_price_text?: string | null
          status?: string
          stone_id?: string | null
          warnings?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_intake_log_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_intake_log_stone_id_fkey"
            columns: ["stone_id"]
            isOneToOne: false
            referencedRelation: "stones"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          jeweller_id: string
          stone_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jeweller_id: string
          stone_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jeweller_id?: string
          stone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_jeweller_id_fkey"
            columns: ["jeweller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_stone_id_fkey"
            columns: ["stone_id"]
            isOneToOne: false
            referencedRelation: "stones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_referral_code: {
        Args: { _code: string; _user_id: string }
        Returns: undefined
      }
      chaos_extract_still_image_url: { Args: { raw: Json }; Returns: string }
      chaos_is_trusted_image_field_url: {
        Args: { value: string }
        Returns: boolean
      }
      has_account_type: {
        Args: { _check_type: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_stone_share: { Args: { _stone_id: string }; Returns: undefined }
      increment_stone_view: { Args: { _stone_id: string }; Returns: undefined }
      issue_referral_credits: {
        Args: { _new_user_id: string; _qualifying_event: string }
        Returns: undefined
      }
      notify_email_event: {
        Args: { p_record_id: string; p_type: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
