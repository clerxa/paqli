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
      candidate_links: {
        Row: {
          candidate_email: string | null
          candidate_name: string | null
          counter_offer_id: string | null
          created_at: string
          decline_category: string | null
          decline_reason: string | null
          expires_at: string | null
          id: string
          last_reminder_at: string | null
          opened_at: string | null
          organization_id: string
          package_id: string
          reminder_count: number
          reminders_enabled: boolean
          simulated_at: string | null
          status: string
          status_updated_at: string | null
          token: string
        }
        Insert: {
          candidate_email?: string | null
          candidate_name?: string | null
          counter_offer_id?: string | null
          created_at?: string
          decline_category?: string | null
          decline_reason?: string | null
          expires_at?: string | null
          id?: string
          last_reminder_at?: string | null
          opened_at?: string | null
          organization_id: string
          package_id: string
          reminder_count?: number
          reminders_enabled?: boolean
          simulated_at?: string | null
          status?: string
          status_updated_at?: string | null
          token?: string
        }
        Update: {
          candidate_email?: string | null
          candidate_name?: string | null
          counter_offer_id?: string | null
          created_at?: string
          decline_category?: string | null
          decline_reason?: string | null
          expires_at?: string | null
          id?: string
          last_reminder_at?: string | null
          opened_at?: string | null
          organization_id?: string
          package_id?: string
          reminder_count?: number
          reminders_enabled?: boolean
          simulated_at?: string | null
          status?: string
          status_updated_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_links_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      counter_offers: {
        Row: {
          changes: Json
          created_at: string
          created_by: string
          id: string
          message: string | null
          new_link_id: string | null
          organization_id: string
          original_link_id: string
          status: string
          updated_at: string
        }
        Insert: {
          changes?: Json
          created_at?: string
          created_by: string
          id?: string
          message?: string | null
          new_link_id?: string | null
          organization_id: string
          original_link_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          changes?: Json
          created_at?: string
          created_by?: string
          id?: string
          message?: string | null
          new_link_id?: string | null
          organization_id?: string
          original_link_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counter_offers_new_link_id_fkey"
            columns: ["new_link_id"]
            isOneToOne: false
            referencedRelation: "candidate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counter_offers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counter_offers_original_link_id_fkey"
            columns: ["original_link_id"]
            isOneToOne: false
            referencedRelation: "candidate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_devices: {
        Row: {
          cliff_months: number
          created_at: string
          current_valuation_m: number
          id: string
          package_id: string
          quantity: number
          special_conditions: string | null
          strike_price: number
          type: string
          vesting_years: number
        }
        Insert: {
          cliff_months?: number
          created_at?: string
          current_valuation_m?: number
          id?: string
          package_id: string
          quantity?: number
          special_conditions?: string | null
          strike_price?: number
          type: string
          vesting_years?: number
        }
        Update: {
          cliff_months?: number
          created_at?: string
          current_valuation_m?: number
          id?: string
          package_id?: string
          quantity?: number
          special_conditions?: string | null
          strike_price?: number
          type?: string
          vesting_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "equity_devices_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_values: string[] | null
          contract_type: string | null
          created_at: string
          created_by: string
          culture_note: string | null
          flexible_hours: boolean | null
          glassdoor_url: string | null
          growth_paths: Json | null
          id: string
          job_summary: string | null
          location_city: string | null
          location_details: string | null
          manager_style: string | null
          missions: Json | null
          onboarding_note: string | null
          organization_id: string
          process_duration: string | null
          process_steps: Json | null
          remote_days: number | null
          remote_guaranteed: boolean | null
          remote_policy: string | null
          stack: string[] | null
          start_date: string | null
          status: string
          team_description: string | null
          team_size: number | null
          title: string
          training_budget: number | null
          updated_at: string
          wtj_url: string | null
        }
        Insert: {
          company_values?: string[] | null
          contract_type?: string | null
          created_at?: string
          created_by: string
          culture_note?: string | null
          flexible_hours?: boolean | null
          glassdoor_url?: string | null
          growth_paths?: Json | null
          id?: string
          job_summary?: string | null
          location_city?: string | null
          location_details?: string | null
          manager_style?: string | null
          missions?: Json | null
          onboarding_note?: string | null
          organization_id: string
          process_duration?: string | null
          process_steps?: Json | null
          remote_days?: number | null
          remote_guaranteed?: boolean | null
          remote_policy?: string | null
          stack?: string[] | null
          start_date?: string | null
          status?: string
          team_description?: string | null
          team_size?: number | null
          title: string
          training_budget?: number | null
          updated_at?: string
          wtj_url?: string | null
        }
        Update: {
          company_values?: string[] | null
          contract_type?: string | null
          created_at?: string
          created_by?: string
          culture_note?: string | null
          flexible_hours?: boolean | null
          glassdoor_url?: string | null
          growth_paths?: Json | null
          id?: string
          job_summary?: string | null
          location_city?: string | null
          location_details?: string | null
          manager_style?: string | null
          missions?: Json | null
          onboarding_note?: string | null
          organization_id?: string
          process_duration?: string | null
          process_steps?: Json | null
          remote_days?: number | null
          remote_guaranteed?: boolean | null
          remote_policy?: string | null
          stack?: string[] | null
          start_date?: string | null
          status?: string
          team_description?: string | null
          team_size?: number | null
          title?: string
          training_budget?: number | null
          updated_at?: string
          wtj_url?: string | null
        }
        Relationships: []
      }
      link_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          link_id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          link_id: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          link_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "link_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "candidate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          link_id: string
          read_at: string | null
          sender: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          link_id: string
          read_at?: string | null
          sender: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          link_id?: string
          read_at?: string | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "candidate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          plan: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          plan?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          benefits: Json | null
          company_values: string[] | null
          contract_type: string | null
          created_at: string
          created_by: string
          culture_note: string | null
          flexible_hours: boolean | null
          glassdoor_url: string | null
          gross_salary: number | null
          growth_paths: Json | null
          id: string
          job_summary: string | null
          job_type: string | null
          location_city: string | null
          location_details: string | null
          manager_style: string | null
          missions: Json | null
          onboarding_note: string | null
          organization_id: string
          process_duration: string | null
          process_steps: Json | null
          remote_days: number | null
          remote_guaranteed: boolean | null
          remote_policy: string | null
          scenario_display: string
          scenario_message: string | null
          stack: string[] | null
          start_date: string | null
          status: string
          team_description: string | null
          team_size: number | null
          title: string
          training_budget: number | null
          updated_at: string
          variable_target: number | null
          wtj_url: string | null
        }
        Insert: {
          benefits?: Json | null
          company_values?: string[] | null
          contract_type?: string | null
          created_at?: string
          created_by: string
          culture_note?: string | null
          flexible_hours?: boolean | null
          glassdoor_url?: string | null
          gross_salary?: number | null
          growth_paths?: Json | null
          id?: string
          job_summary?: string | null
          job_type?: string | null
          location_city?: string | null
          location_details?: string | null
          manager_style?: string | null
          missions?: Json | null
          onboarding_note?: string | null
          organization_id: string
          process_duration?: string | null
          process_steps?: Json | null
          remote_days?: number | null
          remote_guaranteed?: boolean | null
          remote_policy?: string | null
          scenario_display?: string
          scenario_message?: string | null
          stack?: string[] | null
          start_date?: string | null
          status?: string
          team_description?: string | null
          team_size?: number | null
          title: string
          training_budget?: number | null
          updated_at?: string
          variable_target?: number | null
          wtj_url?: string | null
        }
        Update: {
          benefits?: Json | null
          company_values?: string[] | null
          contract_type?: string | null
          created_at?: string
          created_by?: string
          culture_note?: string | null
          flexible_hours?: boolean | null
          glassdoor_url?: string | null
          gross_salary?: number | null
          growth_paths?: Json | null
          id?: string
          job_summary?: string | null
          job_type?: string | null
          location_city?: string | null
          location_details?: string | null
          manager_style?: string | null
          missions?: Json | null
          onboarding_note?: string | null
          organization_id?: string
          process_duration?: string | null
          process_steps?: Json | null
          remote_days?: number | null
          remote_guaranteed?: boolean | null
          remote_policy?: string | null
          scenario_display?: string
          scenario_message?: string | null
          stack?: string[] | null
          start_date?: string | null
          status?: string
          team_description?: string | null
          team_size?: number | null
          title?: string
          training_budget?: number | null
          updated_at?: string
          variable_target?: number | null
          wtj_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          organization_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          organization_id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          email_sent: boolean
          id: string
          link_id: string
          sent_at: string
          type: string
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          id?: string
          link_id: string
          sent_at?: string
          type: string
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          id?: string
          link_id?: string
          sent_at?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "candidate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_benchmarks: {
        Row: {
          id: string
          job_family: string
          location: string
          p25: number
          p50: number
          p75: number
          seniority: string
          source: string | null
          updated_at: string
          version: string
        }
        Insert: {
          id?: string
          job_family: string
          location?: string
          p25: number
          p50: number
          p75: number
          seniority: string
          source?: string | null
          updated_at: string
          version?: string
        }
        Update: {
          id?: string
          job_family?: string
          location?: string
          p25?: number
          p50?: number
          p75?: number
          seniority?: string
          source?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      savings_devices: {
        Row: {
          avg_3y: number | null
          cap_amount: number | null
          created_at: string
          id: string
          matching_rate: number | null
          package_id: string
          type: string
        }
        Insert: {
          avg_3y?: number | null
          cap_amount?: number | null
          created_at?: string
          id?: string
          matching_rate?: number | null
          package_id: string
          type: string
        }
        Update: {
          avg_3y?: number | null
          cap_amount?: number | null
          created_at?: string
          id?: string
          matching_rate?: number | null
          package_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_devices_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          created_at: string
          display_order: number
          horizon_years: number
          id: string
          label: string
          package_id: string
          target_valuation_m: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          horizon_years?: number
          id?: string
          label: string
          package_id: string
          target_valuation_m?: number
        }
        Update: {
          created_at?: string
          display_order?: number
          horizon_years?: number
          id?: string
          label?: string
          package_id?: string
          target_valuation_m?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          created_at: string
          id: string
          link_id: string
          pee_contribution: number
          result_snapshot: Json
          seniority_years: number
          tax_rules_version: string
          tmi: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_id: string
          pee_contribution?: number
          result_snapshot: Json
          seniority_years: number
          tax_rules_version?: string
          tmi: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          link_id?: string
          pee_contribution?: number
          result_snapshot?: Json
          seniority_years?: number
          tax_rules_version?: string
          tmi?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulations_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: true
            referencedRelation: "candidate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rules: {
        Row: {
          created_at: string
          description: string | null
          device_type: string
          effective_date: string
          id: string
          rule_key: string
          source_url: string | null
          value: number
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          device_type: string
          effective_date: string
          id?: string
          rule_key: string
          source_url?: string | null
          value: number
          version: string
        }
        Update: {
          created_at?: string
          description?: string | null
          device_type?: string
          effective_date?: string
          id?: string
          rule_key?: string
          source_url?: string | null
          value?: number
          version?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_tax_rules: {
        Row: {
          created_at: string | null
          description: string | null
          device_type: string | null
          effective_date: string | null
          id: string | null
          rule_key: string | null
          source_url: string | null
          value: number | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          device_type?: string | null
          effective_date?: string | null
          id?: string | null
          rule_key?: string | null
          source_url?: string | null
          value?: number | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          device_type?: string | null
          effective_date?: string | null
          id?: string | null
          rule_key?: string | null
          source_url?: string | null
          value?: number | null
          version?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bootstrap_user_workspace: {
        Args: { _full_name: string; _org_name: string }
        Returns: string
      }
      current_user_org: { Args: never; Returns: string }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
      app_role: ["admin", "member"],
    },
  },
} as const
