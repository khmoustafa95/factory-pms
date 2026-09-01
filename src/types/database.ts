export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      app_settings: {
        Row: {
          app_name_ar: string
          app_name_en: string
          app_short_name_ar: string
          app_short_name_en: string
          id: number
          logo_url: string | null
          sign_in_description_ar: string
          sign_in_description_en: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          app_name_ar?: string
          app_name_en?: string
          app_short_name_ar?: string
          app_short_name_en?: string
          id?: number
          logo_url?: string | null
          sign_in_description_ar?: string
          sign_in_description_en?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          app_name_ar?: string
          app_name_en?: string
          app_short_name_ar?: string
          app_short_name_en?: string
          id?: number
          logo_url?: string | null
          sign_in_description_ar?: string
          sign_in_description_en?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name_ar: string
          name_en: string
          sort_order: number
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name_ar: string
          name_en: string
          sort_order?: number
          symbol?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name_ar?: string
          name_en?: string
          sort_order?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      factories: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          link_path: string | null
          payload: Json
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link_path?: string | null
          payload?: Json
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link_path?: string | null
          payload?: Json
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          actual_budget: number | null
          actual_end_date: string | null
          created_at: string
          description: string | null
          end_date: string | null
          expected_budget: number
          financial_deviation_reason: string | null
          id: string
          name: string
          problem_description: string | null
          project_id: string
          schedule_deviation_reason: string | null
          solution_in_progress: string | null
          sort_order: number
          start_date: string | null
          status: Database["public"]["Enums"]["phase_status"]
          updated_at: string
          weight_percent: number
        }
        Insert: {
          actual_budget?: number | null
          actual_end_date?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          expected_budget?: number
          financial_deviation_reason?: string | null
          id?: string
          name: string
          problem_description?: string | null
          project_id: string
          schedule_deviation_reason?: string | null
          solution_in_progress?: string | null
          sort_order?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["phase_status"]
          updated_at?: string
          weight_percent?: number
        }
        Update: {
          actual_budget?: number | null
          actual_end_date?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          expected_budget?: number
          financial_deviation_reason?: string | null
          id?: string
          name?: string
          problem_description?: string | null
          project_id?: string
          schedule_deviation_reason?: string | null
          solution_in_progress?: string | null
          sort_order?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["phase_status"]
          updated_at?: string
          weight_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          factory_id: string | null
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          factory_id?: string | null
          full_name: string
          id: string
          is_active?: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          factory_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      project_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          project_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          project_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          project_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_expense_lines: {
        Row: {
          actual_amount: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string
          id: string
          notes: string | null
          phase_id: string | null
          planned_amount: number
          project_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          phase_id?: string | null
          planned_amount: number
          project_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          phase_id?: string | null
          planned_amount?: number
          project_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_expense_lines_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expense_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_funding_entries: {
        Row: {
          amount: number
          created_at: string
          expected_date: string | null
          id: string
          notes: string | null
          project_id: string
          received_date: string | null
          source_name: string | null
          source_type: Database["public"]["Enums"]["funding_source_type"]
          status: Database["public"]["Enums"]["funding_entry_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          project_id: string
          received_date?: string | null
          source_name?: string | null
          source_type: Database["public"]["Enums"]["funding_source_type"]
          status?: Database["public"]["Enums"]["funding_entry_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          received_date?: string | null
          source_name?: string | null
          source_type?: Database["public"]["Enums"]["funding_source_type"]
          status?: Database["public"]["Enums"]["funding_entry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_funding_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_procurement_items: {
        Row: {
          created_at: string
          description: string
          estimated_cost: number
          id: string
          needed_by_date: string | null
          notes: string | null
          phase_id: string | null
          project_id: string
          quantity: number
          sort_order: number
          status: Database["public"]["Enums"]["procurement_status"]
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          estimated_cost?: number
          id?: string
          needed_by_date?: string | null
          notes?: string | null
          phase_id?: string | null
          project_id: string
          quantity?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["procurement_status"]
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          estimated_cost?: number
          id?: string
          needed_by_date?: string | null
          notes?: string | null
          phase_id?: string | null
          project_id?: string
          quantity?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["procurement_status"]
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_procurement_items_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_procurement_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_staff: {
        Row: {
          created_at: string
          end_date: string | null
          full_name: string
          headcount: number
          id: string
          is_contractor: boolean
          notes: string | null
          phase_id: string | null
          project_id: string
          qualifications: string | null
          role_title: string
          sort_order: number
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          full_name: string
          headcount?: number
          id?: string
          is_contractor?: boolean
          notes?: string | null
          phase_id?: string | null
          project_id: string
          qualifications?: string | null
          role_title: string
          sort_order?: number
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          full_name?: string
          headcount?: number
          id?: string
          is_contractor?: boolean
          notes?: string | null
          phase_id?: string | null
          project_id?: string
          qualifications?: string | null
          role_title?: string
          sort_order?: number
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_staff_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_staff_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_status_transitions: {
        Row: {
          changed_by: string
          changed_by_name: string
          changed_by_role: Database["public"]["Enums"]["user_role"]
          created_at: string
          from_status: Database["public"]["Enums"]["project_status"]
          id: string
          project_id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["project_status"]
        }
        Insert: {
          changed_by: string
          changed_by_name: string
          changed_by_role: Database["public"]["Enums"]["user_role"]
          created_at?: string
          from_status: Database["public"]["Enums"]["project_status"]
          id?: string
          project_id: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["project_status"]
        }
        Update: {
          changed_by?: string
          changed_by_name?: string
          changed_by_role?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          from_status?: Database["public"]["Enums"]["project_status"]
          id?: string
          project_id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["project_status"]
        }
        Relationships: [
          {
            foreignKeyName: "project_status_transitions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_status_transitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_pm_id: string | null
          budget: number | null
          code: string
          created_at: string
          currency: string
          description: string | null
          factory_id: string
          id: string
          progress_percent: number
          proposed_by: string | null
          proposed_duration_unit:
            | Database["public"]["Enums"]["duration_unit"]
            | null
          proposed_duration_value: number | null
          proposed_end_date: string | null
          proposed_start_date: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_pm_id?: string | null
          budget?: number | null
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          factory_id: string
          id?: string
          progress_percent?: number
          proposed_by?: string | null
          proposed_duration_unit?:
            | Database["public"]["Enums"]["duration_unit"]
            | null
          proposed_duration_value?: number | null
          proposed_end_date?: string | null
          proposed_start_date?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_pm_id?: string | null
          budget?: number | null
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          factory_id?: string
          id?: string
          progress_percent?: number
          proposed_by?: string | null
          proposed_duration_unit?:
            | Database["public"]["Enums"]["duration_unit"]
            | null
          proposed_duration_value?: number | null
          proposed_end_date?: string | null
          proposed_start_date?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_assigned_pm_id_fkey"
            columns: ["assigned_pm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_cost: number
          actual_duration_days: number
          actual_end_date: string | null
          assignee_id: string | null
          blocked_reason: string | null
          cost_category: Database["public"]["Enums"]["cost_category"]
          created_at: string
          description: string | null
          due_date: string | null
          expected_cost: number
          expected_duration_days: number
          financial_deviation_reason: string | null
          id: string
          phase_id: string
          progress_percent: number
          project_id: string
          schedule_deviation_reason: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          weight_percent: number
        }
        Insert: {
          actual_cost?: number
          actual_duration_days?: number
          actual_end_date?: string | null
          assignee_id?: string | null
          blocked_reason?: string | null
          cost_category?: Database["public"]["Enums"]["cost_category"]
          created_at?: string
          description?: string | null
          due_date?: string | null
          expected_cost?: number
          expected_duration_days?: number
          financial_deviation_reason?: string | null
          id?: string
          phase_id: string
          progress_percent?: number
          project_id: string
          schedule_deviation_reason?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          weight_percent?: number
        }
        Update: {
          actual_cost?: number
          actual_duration_days?: number
          actual_end_date?: string | null
          assignee_id?: string | null
          blocked_reason?: string | null
          cost_category?: Database["public"]["Enums"]["cost_category"]
          created_at?: string
          description?: string | null
          due_date?: string | null
          expected_cost?: number
          expected_duration_days?: number
          financial_deviation_reason?: string | null
          id?: string
          phase_id?: string
          progress_percent?: number
          project_id?: string
          schedule_deviation_reason?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          weight_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_project: { Args: { p_project_id: string }; Returns: boolean }
      create_comment: {
        Args: {
          p_body: string
          p_entity_id: string
          p_entity_type: Database["public"]["Enums"]["entity_type"]
          p_mentioned_user_ids?: string[]
        }
        Returns: {
          author_id: string
          body: string
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_notification: {
        Args: {
          p_entity_id?: string
          p_entity_type?: string
          p_link_path?: string
          p_payload?: Json
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      duration_to_days: {
        Args: {
          p_unit: Database["public"]["Enums"]["duration_unit"]
          p_value: number
        }
        Returns: number
      }
      get_auth_factory_id: { Args: never; Returns: string }
      get_auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_dashboard_insights: {
        Args: never
        Returns: {
          financial_deviation_phase_count: number
          overdue_phase_count: number
          overdue_procurement_count: number
          overdue_task_count: number
          phase_issue_count: number
          progress_buckets: Json
          project_status_counts: Json
          proposed_count: number
          schedule_deviation_phase_count: number
          task_status_counts: Json
          top_blocked_projects: Json
          total_projects: number
          total_tasks: number
          underfunded_project_count: number
          upcoming_due_task_count: number
        }[]
      }
      get_dashboard_projects: {
        Args: never
        Returns: {
          actual_end_date: string
          actual_start_date: string
          blocked_task_count: number
          budget: number
          budget_used_pct: number | null
          currency: string
          done_task_count: number
          factory_code: string
          factory_id: string
          factory_name: string
          funding_received: number
          has_funding_gap: boolean
          has_phase_issue: boolean
          id: string
          in_progress_task_count: number
          open_procurement_count: number
          overdue_procurement_count: number
          overdue_phase_count: number
          overdue_task_count: number
          progress_percent: number
          proposed_duration_unit: Database["public"]["Enums"]["duration_unit"]
          proposed_duration_value: number
          proposed_end_date: string
          proposed_start_date: string
          status: Database["public"]["Enums"]["project_status"]
          title: string
          todo_task_count: number
          total_task_count: number
        }[]
      }
      get_dashboard_stats: {
        Args: never
        Returns: {
          active_project_count: number
          average_progress: number
          blocked_task_count: number
          draft_count: number
          factory_count: number
          in_progress_count: number
          overdue_task_count: number
          proposed_count: number
        }[]
      }
      get_project_activity: {
        Args: { p_project_id: string }
        Returns: {
          activity_kind: string
          author_full_name: string
          author_id: string
          author_role: Database["public"]["Enums"]["user_role"]
          body: string
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          from_status: Database["public"]["Enums"]["project_status"]
          id: string
          reason: string
          to_status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }[]
      }
      get_project_financial_snapshot: {
        Args: { p_project_id: string }
        Returns: {
          approved_budget: number | null
          budget_remaining: number | null
          expense_plan_overhead: number
          expense_plan_total: number
          expense_plan_wbs: number
          funding_gap: number | null
          funding_planned: number
          funding_received: number
          spent_overhead: number
          spent_total: number
          spent_wbs: number
        }[]
      }
      get_projects_financial_summary: {
        Args: never
        Returns: {
          budget_used_pct: number | null
          funding_received: number
          has_funding_gap: boolean
          open_procurement_count: number
          overdue_procurement_count: number
          project_id: string
        }[]
      }
      is_assigned_pm: { Args: { p_project_id: string }; Returns: boolean }
      is_auth_active: { Args: never; Returns: boolean }
      is_company_director: { Args: never; Returns: boolean }
      list_mentionable_profiles: {
        Args: { p_project_id: string }
        Returns: {
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      notify_company_directors: {
        Args: {
          p_entity_id?: string
          p_entity_type?: string
          p_link_path?: string
          p_payload?: Json
          p_type: string
        }
        Returns: undefined
      }
      notify_factory_managers: {
        Args: {
          p_entity_id?: string
          p_entity_type?: string
          p_factory_id: string
          p_link_path?: string
          p_payload?: Json
          p_type: string
        }
        Returns: undefined
      }
      project_duration_days: {
        Args: { p_project: Database["public"]["Tables"]["projects"]["Row"] }
        Returns: number
      }
      project_execution_ready: {
        Args: { p_project: Database["public"]["Tables"]["projects"]["Row"] }
        Returns: boolean
      }
      project_schedule_end: {
        Args: { p_project: Database["public"]["Tables"]["projects"]["Row"] }
        Returns: string
      }
      project_schedule_start: {
        Args: { p_project: Database["public"]["Tables"]["projects"]["Row"] }
        Returns: string
      }
      recalculate_project_progress: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      resolve_project_id_for_entity: {
        Args: {
          p_entity_id: string
          p_entity_type: Database["public"]["Enums"]["entity_type"]
        }
        Returns: string
      }
      revoke_user_sessions: { Args: { p_user_id: string }; Returns: undefined }
      transition_project_status: {
        Args: {
          p_project_id: string
          p_reason?: string
          p_target_status: Database["public"]["Enums"]["project_status"]
        }
        Returns: {
          actual_end_date: string | null
          actual_start_date: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_pm_id: string | null
          budget: number | null
          code: string
          created_at: string
          currency: string
          description: string | null
          factory_id: string
          id: string
          progress_percent: number
          proposed_by: string | null
          proposed_duration_unit:
            | Database["public"]["Enums"]["duration_unit"]
            | null
          proposed_duration_value: number | null
          proposed_end_date: string | null
          proposed_start_date: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      cost_category: "raw_material" | "non_raw_material"
      duration_unit: "day" | "week" | "month"
      entity_type: "project" | "phase" | "task"
      expense_category:
        | "materials"
        | "labor"
        | "equipment"
        | "overhead"
        | "other"
      funding_entry_status: "planned" | "received" | "cancelled"
      funding_source_type: "internal" | "loan" | "grant" | "partner" | "other"
      phase_status: "pending" | "in_progress" | "completed"
      procurement_status: "planned" | "ordered" | "delivered" | "cancelled"
      project_status:
        | "draft"
        | "proposed"
        | "approved"
        | "rejected"
        | "in_progress"
        | "completed"
        | "paused"
      task_status: "todo" | "in_progress" | "blocked" | "done"
      user_role: "company_director" | "factory_manager" | "project_manager"
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
    Enums: {
      cost_category: ["raw_material", "non_raw_material"],
      duration_unit: ["day", "week", "month"],
      entity_type: ["project", "phase", "task"],
      expense_category: [
        "materials",
        "labor",
        "equipment",
        "overhead",
        "other",
      ],
      funding_entry_status: ["planned", "received", "cancelled"],
      funding_source_type: ["internal", "loan", "grant", "partner", "other"],
      phase_status: ["pending", "in_progress", "completed"],
      procurement_status: ["planned", "ordered", "delivered", "cancelled"],
      project_status: [
        "draft",
        "proposed",
        "approved",
        "rejected",
        "in_progress",
        "completed",
        "paused",
      ],
      task_status: ["todo", "in_progress", "blocked", "done"],
      user_role: ["company_director", "factory_manager", "project_manager"],
    },
  },
} as const

export type UserRole = Database['public']['Enums']['user_role']
export type ProjectStatus = Database['public']['Enums']['project_status']
export type PhaseStatus = Database['public']['Enums']['phase_status']
export type DurationUnit = Database['public']['Enums']['duration_unit']
export type TaskStatus = Database['public']['Enums']['task_status']
export type CostCategory = Database['public']['Enums']['cost_category']
export type EntityType = Database['public']['Enums']['entity_type']
export type FundingSourceType =
  Database['public']['Enums']['funding_source_type']
export type FundingEntryStatus =
  Database['public']['Enums']['funding_entry_status']
export type ProcurementStatus =
  Database['public']['Enums']['procurement_status']
export type ExpenseCategory = Database['public']['Enums']['expense_category']

export type FieldHealthStatus =
  | 'on_track'
  | 'delayed'
  | 'over_budget'
  | 'delayed_and_over_budget'

export type NotificationType =
  | 'project_proposed'
  | 'project_approved'
  | 'project_rejected'
  | 'project_started'
  | 'project_paused'
  | 'project_resumed'
  | 'project_completed'
  | 'task_blocked'
  | 'comment_project'
  | 'comment_task'
  | 'comment_mention'

export interface NotificationPayload {
  projectTitle?: string
  projectCode?: string
  taskTitle?: string
  actorName?: string
  reason?: string | null
  preview?: string
}

export type AppSettings = Database['public']['Tables']['app_settings']['Row']
export type AppSettingsUpdate =
  Database['public']['Tables']['app_settings']['Update']
export type Factory = Database['public']['Tables']['factories']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Phase = Database['public']['Tables']['phases']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type AppNotification =
  Database['public']['Tables']['notifications']['Row']
export type Currency = Database['public']['Tables']['currencies']['Row']
export type CurrencyInsert =
  Database['public']['Tables']['currencies']['Insert']
export type CurrencyUpdate =
  Database['public']['Tables']['currencies']['Update']
export type ProjectFundingEntry =
  Database['public']['Tables']['project_funding_entries']['Row']
export type ProjectProcurementItem =
  Database['public']['Tables']['project_procurement_items']['Row']
export type ProjectStaff = Database['public']['Tables']['project_staff']['Row']
export type ProjectExpenseLine =
  Database['public']['Tables']['project_expense_lines']['Row']

export type ProjectFinancialSnapshot =
  Database['public']['Functions']['get_project_financial_snapshot']['Returns'][number]

export type ProjectFinancialSummary =
  Database['public']['Functions']['get_projects_financial_summary']['Returns'][number]

export type {
  CommentListItem,
  EscalationItem,
  EscalationProject,
  FactorySummary,
  ProfileSummary,
  ProfileWithFactory,
  ProjectDetail,
  ProjectListItem,
  TaskListItem,
} from '@/types/joins'
