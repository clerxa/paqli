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
      ai_conversations: {
        Row: {
          answer: string
          created_at: string
          id: string
          link_id: string
          question: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          link_id: string
          question: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          link_id?: string
          question?: string
        }
        Relationships: []
      }
      ai_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_code: string | null
          id: string
          input_tokens: number | null
          model: string
          organization_id: string | null
          output_tokens: number | null
          prompt_name: string
          prompt_version: string
          retries: number
          success: boolean
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          input_tokens?: number | null
          model: string
          organization_id?: string | null
          output_tokens?: number | null
          prompt_name: string
          prompt_version: string
          retries?: number
          success: boolean
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          input_tokens?: number | null
          model?: string
          organization_id?: string | null
          output_tokens?: number | null
          prompt_name?: string
          prompt_version?: string
          retries?: number
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          system_prompt: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          system_prompt: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          system_prompt?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_events: {
        Row: {
          created_at: string
          duration_s: number | null
          event_type: string
          id: string
          link_id: string
          section: string | null
          value: string | null
        }
        Insert: {
          created_at?: string
          duration_s?: number | null
          event_type: string
          id?: string
          link_id: string
          section?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string
          duration_s?: number | null
          event_type?: string
          id?: string
          link_id?: string
          section?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavior_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "candidate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_links: {
        Row: {
          ai_questions_cap: number
          ai_questions_count: number
          behavior_data: Json | null
          candidate_email: string | null
          candidate_name: string | null
          counter_offer_id: string | null
          created_at: string
          deadline_notified_24h: boolean
          deadline_notified_48h: boolean
          deadline_notified_expired: boolean
          decision_deadline: string | null
          decline_category: string | null
          decline_reason: string | null
          engagement_label: string | null
          engagement_score: number | null
          expires_at: string | null
          id: string
          intent_computed_at: string | null
          intent_prediction: string | null
          last_reminder_at: string | null
          opened_at: string | null
          organization_id: string
          package_id: string | null
          reminder_count: number
          reminders_enabled: boolean
          return_visits: number
          simulated_at: string | null
          status: string
          status_updated_at: string | null
          thinking_at: string | null
          thinking_note: string | null
          time_on_page_total: number
          token: string
        }
        Insert: {
          ai_questions_cap?: number
          ai_questions_count?: number
          behavior_data?: Json | null
          candidate_email?: string | null
          candidate_name?: string | null
          counter_offer_id?: string | null
          created_at?: string
          deadline_notified_24h?: boolean
          deadline_notified_48h?: boolean
          deadline_notified_expired?: boolean
          decision_deadline?: string | null
          decline_category?: string | null
          decline_reason?: string | null
          engagement_label?: string | null
          engagement_score?: number | null
          expires_at?: string | null
          id?: string
          intent_computed_at?: string | null
          intent_prediction?: string | null
          last_reminder_at?: string | null
          opened_at?: string | null
          organization_id: string
          package_id?: string | null
          reminder_count?: number
          reminders_enabled?: boolean
          return_visits?: number
          simulated_at?: string | null
          status?: string
          status_updated_at?: string | null
          thinking_at?: string | null
          thinking_note?: string | null
          time_on_page_total?: number
          token?: string
        }
        Update: {
          ai_questions_cap?: number
          ai_questions_count?: number
          behavior_data?: Json | null
          candidate_email?: string | null
          candidate_name?: string | null
          counter_offer_id?: string | null
          created_at?: string
          deadline_notified_24h?: boolean
          deadline_notified_48h?: boolean
          deadline_notified_expired?: boolean
          decision_deadline?: string | null
          decline_category?: string | null
          decline_reason?: string | null
          engagement_label?: string | null
          engagement_score?: number | null
          expires_at?: string | null
          id?: string
          intent_computed_at?: string | null
          intent_prediction?: string | null
          last_reminder_at?: string | null
          opened_at?: string | null
          organization_id?: string
          package_id?: string | null
          reminder_count?: number
          reminders_enabled?: boolean
          return_visits?: number
          simulated_at?: string | null
          status?: string
          status_updated_at?: string | null
          thinking_at?: string | null
          thinking_note?: string | null
          time_on_page_total?: number
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
      competitors: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          salary_max: number | null
          salary_min: number | null
          strengths: string[]
          updated_at: string
          weaknesses: string[]
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          salary_max?: number | null
          salary_min?: number | null
          strengths?: string[]
          updated_at?: string
          weaknesses?: string[]
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          salary_max?: number | null
          salary_min?: number | null
          strengths?: string[]
          updated_at?: string
          weaknesses?: string[]
          website?: string | null
        }
        Relationships: []
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
      demo_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          employees_count: string | null
          first_name: string | null
          id: string
          last_name: string | null
          name: string | null
          phone: string | null
          role: string | null
          source: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          employees_count?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          source?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          employees_count?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          source?: string | null
        }
        Relationships: []
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
      offer_letters: {
        Row: {
          created_at: string
          created_by: string
          edits: Json
          id: string
          link_id: string
          organization_id: string
          package_id: string
          pdf_path: string | null
          sent_at: string | null
          snapshot: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          edits?: Json
          id?: string
          link_id: string
          organization_id: string
          package_id: string
          pdf_path?: string | null
          sent_at?: string | null
          snapshot: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          edits?: Json
          id?: string
          link_id?: string
          organization_id?: string
          package_id?: string
          pdf_path?: string | null
          sent_at?: string | null
          snapshot?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_letters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "candidate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      org_benefit_catalog: {
        Row: {
          annual_value: number | null
          benefit_key: string
          category: string
          created_at: string
          custom_label: string | null
          display_order: number
          employer_share: number | null
          id: string
          monthly_value: number | null
          organization_id: string
          updated_at: string
          value_type: string
        }
        Insert: {
          annual_value?: number | null
          benefit_key: string
          category: string
          created_at?: string
          custom_label?: string | null
          display_order?: number
          employer_share?: number | null
          id?: string
          monthly_value?: number | null
          organization_id: string
          updated_at?: string
          value_type?: string
        }
        Update: {
          annual_value?: number | null
          benefit_key?: string
          category?: string
          created_at?: string
          custom_label?: string | null
          display_order?: number
          employer_share?: number | null
          id?: string
          monthly_value?: number | null
          organization_id?: string
          updated_at?: string
          value_type?: string
        }
        Relationships: []
      }
      org_equity_catalog: {
        Row: {
          cliff_months: number
          created_at: string
          default_strike_price: number
          default_valuation_m: number
          display_order: number
          id: string
          organization_id: string
          special_conditions: string | null
          type: string
          updated_at: string
          vesting_years: number
        }
        Insert: {
          cliff_months?: number
          created_at?: string
          default_strike_price?: number
          default_valuation_m?: number
          display_order?: number
          id?: string
          organization_id: string
          special_conditions?: string | null
          type: string
          updated_at?: string
          vesting_years?: number
        }
        Update: {
          cliff_months?: number
          created_at?: string
          default_strike_price?: number
          default_valuation_m?: number
          display_order?: number
          id?: string
          organization_id?: string
          special_conditions?: string | null
          type?: string
          updated_at?: string
          vesting_years?: number
        }
        Relationships: []
      }
      org_savings_catalog: {
        Row: {
          created_at: string
          default_avg_3y: number | null
          default_cap_amount: number | null
          default_matching_rate: number | null
          display_order: number
          id: string
          organization_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_avg_3y?: number | null
          default_cap_amount?: number | null
          default_matching_rate?: number | null
          display_order?: number
          id?: string
          organization_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_avg_3y?: number | null
          default_cap_amount?: number | null
          default_matching_rate?: number | null
          display_order?: number
          id?: string
          organization_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address_city: string | null
          address_street: string | null
          address_zip: string | null
          created_at: string
          culture_note: string | null
          description: string | null
          id: string
          key_figures: Json
          links: Json
          logo_url: string | null
          monthly_link_quota: number | null
          name: string
          plan: string
          profile_generated_at: string | null
          siret: string | null
          slug: string
          source_urls: string[]
          updated_at: string
          values: string[]
        }
        Insert: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          culture_note?: string | null
          description?: string | null
          id?: string
          key_figures?: Json
          links?: Json
          logo_url?: string | null
          monthly_link_quota?: number | null
          name: string
          plan?: string
          profile_generated_at?: string | null
          siret?: string | null
          slug: string
          source_urls?: string[]
          updated_at?: string
          values?: string[]
        }
        Update: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          culture_note?: string | null
          description?: string | null
          id?: string
          key_figures?: Json
          links?: Json
          logo_url?: string | null
          monthly_link_quota?: number | null
          name?: string
          plan?: string
          profile_generated_at?: string | null
          siret?: string | null
          slug?: string
          source_urls?: string[]
          updated_at?: string
          values?: string[]
        }
        Relationships: []
      }
      package_benchmarks: {
        Row: {
          content: Json
          generated_at: string
          generated_by: string | null
          model: string | null
          organization_id: string
          package_id: string
          prompt_version: string | null
        }
        Insert: {
          content: Json
          generated_at?: string
          generated_by?: string | null
          model?: string | null
          organization_id: string
          package_id: string
          prompt_version?: string | null
        }
        Update: {
          content?: Json
          generated_at?: string
          generated_by?: string | null
          model?: string | null
          organization_id?: string
          package_id?: string
          prompt_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_benchmarks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_benchmarks_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_benefits: {
        Row: {
          annual_value: number | null
          benefit_key: string
          category: string
          created_at: string
          custom_label: string | null
          custom_note: string | null
          display_order: number
          employer_share: number | null
          id: string
          monthly_value: number | null
          package_id: string
          value_type: string
        }
        Insert: {
          annual_value?: number | null
          benefit_key: string
          category: string
          created_at?: string
          custom_label?: string | null
          custom_note?: string | null
          display_order?: number
          employer_share?: number | null
          id?: string
          monthly_value?: number | null
          package_id: string
          value_type?: string
        }
        Update: {
          annual_value?: number | null
          benefit_key?: string
          category?: string
          created_at?: string
          custom_label?: string | null
          custom_note?: string | null
          display_order?: number
          employer_share?: number | null
          id?: string
          monthly_value?: number | null
          package_id?: string
          value_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_benefits_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          attractiveness_computed: string | null
          attractiveness_score: number | null
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
          interview_notes: string | null
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
          trial_period_months: number | null
          trial_period_renewable: boolean | null
          updated_at: string
          variable_config: Json
          variable_target: number | null
          wtj_url: string | null
        }
        Insert: {
          attractiveness_computed?: string | null
          attractiveness_score?: number | null
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
          interview_notes?: string | null
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
          trial_period_months?: number | null
          trial_period_renewable?: boolean | null
          updated_at?: string
          variable_config?: Json
          variable_target?: number | null
          wtj_url?: string | null
        }
        Update: {
          attractiveness_computed?: string | null
          attractiveness_score?: number | null
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
          interview_notes?: string | null
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
          trial_period_months?: number | null
          trial_period_renewable?: boolean | null
          updated_at?: string
          variable_config?: Json
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          organization_id?: string
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
      links_sent_this_month: { Args: { _org_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "member" | "manager" | "validator"
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
      app_role: ["admin", "member", "manager", "validator"],
    },
  },
} as const
