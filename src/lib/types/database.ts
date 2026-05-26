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
      accounts: {
        Row: {
          broker: string
          created_at: string
          currency: string
          external_id: string
          id: string
          label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          broker?: string
          created_at?: string
          currency: string
          external_id: string
          id?: string
          label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          broker?: string
          created_at?: string
          currency?: string
          external_id?: string
          id?: string
          label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_runs: {
        Row: {
          cost_usd: number | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          metadata: Json
          mode: string
          model: string
          status: string
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          metadata?: Json
          mode: string
          model: string
          status?: string
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          metadata?: Json
          mode?: string
          model?: string
          status?: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: []
      }
      alert_events: {
        Row: {
          alert_id: string
          context: Json
          id: string
          is_read: boolean
          message: string | null
          triggered_at: string
          user_id: string
        }
        Insert: {
          alert_id: string
          context: Json
          id?: string
          is_read?: boolean
          message?: string | null
          triggered_at?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          context?: Json
          id?: string
          is_read?: boolean
          message?: string | null
          triggered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["alert_kind"]
          label: string | null
          symbol: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["alert_kind"]
          label?: string | null
          symbol?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["alert_kind"]
          label?: string | null
          symbol?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      briefings: {
        Row: {
          content: string
          cost_usd: number | null
          created_at: string
          for_date: string
          id: string
          model: string | null
          snapshot_id: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          content: string
          cost_usd?: number | null
          created_at?: string
          for_date: string
          id?: string
          model?: string | null
          snapshot_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          content?: string
          cost_usd?: number | null
          created_at?: string
          for_date?: string
          id?: string
          model?: string | null
          snapshot_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefings_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      dev_metrics: {
        Row: {
          commits_30d: number | null
          commits_7d: number | null
          contributors_30d: number | null
          inserted_at: string
          instrument_id: string
          last_release_at: string | null
          last_release_tag: string | null
          metadata: Json
          observed_on: string
          open_issues: number | null
          stars: number | null
        }
        Insert: {
          commits_30d?: number | null
          commits_7d?: number | null
          contributors_30d?: number | null
          inserted_at?: string
          instrument_id: string
          last_release_at?: string | null
          last_release_tag?: string | null
          metadata?: Json
          observed_on: string
          open_issues?: number | null
          stars?: number | null
        }
        Update: {
          commits_30d?: number | null
          commits_7d?: number | null
          contributors_30d?: number | null
          inserted_at?: string
          instrument_id?: string
          last_release_at?: string | null
          last_release_tag?: string | null
          metadata?: Json
          observed_on?: string
          open_issues?: number | null
          stars?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dev_metrics_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings: {
        Row: {
          account_id: string
          accrued_interest: number | null
          avg_cost: number | null
          book_value: number | null
          borrow_value: number | null
          currency: string | null
          day_change_amount: number | null
          day_change_pct: number | null
          description: string | null
          id: string
          imported_at: string | null
          instrument_id: string | null
          is_zombie: boolean
          market_price: number | null
          market_value: number | null
          quantity: number
          source_row: Json | null
          symbol: string
          theme_id: string | null
          unrealized_pnl: number | null
          unrealized_pnl_pct: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          accrued_interest?: number | null
          avg_cost?: number | null
          book_value?: number | null
          borrow_value?: number | null
          currency?: string | null
          day_change_amount?: number | null
          day_change_pct?: number | null
          description?: string | null
          id?: string
          imported_at?: string | null
          instrument_id?: string | null
          is_zombie?: boolean
          market_price?: number | null
          market_value?: number | null
          quantity?: number
          source_row?: Json | null
          symbol: string
          theme_id?: string | null
          unrealized_pnl?: number | null
          unrealized_pnl_pct?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          accrued_interest?: number | null
          avg_cost?: number | null
          book_value?: number | null
          borrow_value?: number | null
          currency?: string | null
          day_change_amount?: number | null
          day_change_pct?: number | null
          description?: string | null
          id?: string
          imported_at?: string | null
          instrument_id?: string | null
          is_zombie?: boolean
          market_price?: number | null
          market_value?: number | null
          quantity?: number
          source_row?: Json | null
          symbol?: string
          theme_id?: string | null
          unrealized_pnl?: number | null
          unrealized_pnl_pct?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          coingecko_id: string | null
          created_at: string
          currency: string | null
          description: string | null
          github_repo: string | null
          id: string
          kind: Database["public"]["Enums"]["instrument_kind"]
          metadata: Json
          sector: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          coingecko_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          github_repo?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["instrument_kind"]
          metadata?: Json
          sector?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          coingecko_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          github_repo?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["instrument_kind"]
          metadata?: Json
          sector?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      macro_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          metadata: Json
          scheduled_at: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          scheduled_at: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          scheduled_at?: string
          title?: string
        }
        Relationships: []
      }
      macro_points: {
        Row: {
          inserted_at: string
          observed_at: string
          series_id: string
          value: number
        }
        Insert: {
          inserted_at?: string
          observed_at: string
          series_id: string
          value: number
        }
        Update: {
          inserted_at?: string
          observed_at?: string
          series_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "macro_points_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "macro_series"
            referencedColumns: ["id"]
          },
        ]
      }
      macro_series: {
        Row: {
          created_at: string
          frequency: string | null
          id: string
          key: string
          label: string
          metadata: Json
          source: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          frequency?: string | null
          id?: string
          key: string
          label: string
          metadata?: Json
          source: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          frequency?: string | null
          id?: string
          key?: string
          label?: string
          metadata?: Json
          source?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_token_budget: number
          base_currency: string
          created_at: string
          display_name: string | null
          id: string
          locale: string
          timezone: string
          updated_at: string
        }
        Insert: {
          ai_token_budget?: number
          base_currency?: string
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          ai_token_budget?: number
          base_currency?: string
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      snapshots: {
        Row: {
          created_at: string
          currency: string
          id: string
          payload: Json
          taken_at: string
          total_value: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          payload: Json
          taken_at?: string
          total_value?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          payload?: Json
          taken_at?: string
          total_value?: number | null
          user_id?: string
        }
        Relationships: []
      }
      themes: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          slug: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          slug: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          slug?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      alert_kind:
        | "price_threshold"
        | "pct_change"
        | "macro_release"
        | "event_proximity"
        | "custom"
      instrument_kind: "equity" | "etf" | "crypto" | "cash" | "option" | "other"
    }
    CompositeTypes: Record<string, never>
  }
}
