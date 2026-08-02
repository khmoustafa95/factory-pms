export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole =
  'company_director' | 'factory_manager' | 'project_manager'

export type ProjectStatus =
  | 'draft'
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'paused'

export type PhaseStatus = 'pending' | 'in_progress' | 'completed'

export type DurationUnit = 'day' | 'week' | 'month'

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

export type CostCategory = 'raw_material' | 'non_raw_material'

export type EntityType = 'project' | 'phase' | 'task'

export type FieldHealthStatus =
  'on_track' | 'delayed' | 'over_budget' | 'delayed_and_over_budget'

export interface Database {
  public: {
    Tables: {
      factories: {
        Row: {
          id: string
          name: string
          code: string
          location: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          location?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          location?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          factory_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: UserRole
          factory_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: UserRole
          factory_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_factory_id_fkey'
            columns: ['factory_id']
            isOneToOne: false
            referencedRelation: 'factories'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          id: string
          factory_id: string
          code: string
          title: string
          description: string | null
          status: ProjectStatus
          budget: number | null
          currency: string
          proposed_start_date: string | null
          proposed_end_date: string | null
          proposed_duration_value: number | null
          proposed_duration_unit: DurationUnit | null
          actual_start_date: string | null
          actual_end_date: string | null
          proposed_by: string | null
          assigned_pm_id: string | null
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          progress_percent: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          factory_id: string
          code: string
          title: string
          description?: string | null
          status?: ProjectStatus
          budget?: number | null
          currency?: string
          proposed_start_date?: string | null
          proposed_end_date?: string | null
          proposed_duration_value?: number | null
          proposed_duration_unit?: DurationUnit | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          proposed_by?: string | null
          assigned_pm_id?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          progress_percent?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          factory_id?: string
          code?: string
          title?: string
          description?: string | null
          status?: ProjectStatus
          budget?: number | null
          currency?: string
          proposed_start_date?: string | null
          proposed_end_date?: string | null
          proposed_duration_value?: number | null
          proposed_duration_unit?: DurationUnit | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          proposed_by?: string | null
          assigned_pm_id?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          progress_percent?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_factory_id_fkey'
            columns: ['factory_id']
            isOneToOne: false
            referencedRelation: 'factories'
            referencedColumns: ['id']
          },
        ]
      }
      phases: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          weight_percent: number
          status: PhaseStatus
          start_date: string | null
          end_date: string | null
          expected_budget: number
          actual_budget: number | null
          actual_end_date: string | null
          schedule_deviation_reason: string | null
          financial_deviation_reason: string | null
          problem_description: string | null
          solution_in_progress: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          weight_percent?: number
          status?: PhaseStatus
          start_date?: string | null
          end_date?: string | null
          expected_budget?: number
          actual_budget?: number | null
          actual_end_date?: string | null
          schedule_deviation_reason?: string | null
          financial_deviation_reason?: string | null
          problem_description?: string | null
          solution_in_progress?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          weight_percent?: number
          status?: PhaseStatus
          start_date?: string | null
          end_date?: string | null
          expected_budget?: number
          actual_budget?: number | null
          actual_end_date?: string | null
          schedule_deviation_reason?: string | null
          financial_deviation_reason?: string | null
          problem_description?: string | null
          solution_in_progress?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'phases_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          phase_id: string
          title: string
          description: string | null
          status: TaskStatus
          blocked_reason: string | null
          assignee_id: string | null
          due_date: string | null
          weight_percent: number
          progress_percent: number
          expected_duration_days: number
          actual_duration_days: number
          expected_cost: number
          actual_cost: number
          cost_category: CostCategory
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          phase_id: string
          title: string
          description?: string | null
          status?: TaskStatus
          blocked_reason?: string | null
          assignee_id?: string | null
          due_date?: string | null
          weight_percent?: number
          progress_percent?: number
          expected_duration_days?: number
          actual_duration_days?: number
          expected_cost?: number
          actual_cost?: number
          cost_category?: CostCategory
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          phase_id?: string
          title?: string
          description?: string | null
          status?: TaskStatus
          blocked_reason?: string | null
          assignee_id?: string | null
          due_date?: string | null
          weight_percent?: number
          progress_percent?: number
          expected_duration_days?: number
          actual_duration_days?: number
          expected_cost?: number
          actual_cost?: number
          cost_category?: CostCategory
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_phase_id_fkey'
            columns: ['phase_id']
            isOneToOne: false
            referencedRelation: 'phases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      app_settings: {
        Row: {
          id: number
          app_name_en: string
          app_name_ar: string
          app_short_name_en: string
          app_short_name_ar: string
          logo_url: string | null
          sign_in_description_en: string
          sign_in_description_ar: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          app_name_en?: string
          app_name_ar?: string
          app_short_name_en?: string
          app_short_name_ar?: string
          logo_url?: string | null
          sign_in_description_en?: string
          sign_in_description_ar?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          app_name_en?: string
          app_name_ar?: string
          app_short_name_en?: string
          app_short_name_ar?: string
          logo_url?: string | null
          sign_in_description_en?: string
          sign_in_description_ar?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      currencies: {
        Row: {
          id: string
          code: string
          name_en: string
          name_ar: string
          symbol: string
          is_default: boolean
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name_en: string
          name_ar: string
          symbol?: string
          is_default?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name_en?: string
          name_ar?: string
          symbol?: string
          is_default?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_attachments: {
        Row: {
          id: string
          project_id: string
          uploaded_by: string
          file_name: string
          storage_path: string
          mime_type: string | null
          file_size_bytes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          uploaded_by: string
          file_name: string
          storage_path: string
          mime_type?: string | null
          file_size_bytes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          uploaded_by?: string
          file_name?: string
          storage_path?: string
          mime_type?: string | null
          file_size_bytes?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_attachments_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_attachments_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      project_status_transitions: {
        Row: {
          id: string
          project_id: string
          from_status: ProjectStatus
          to_status: ProjectStatus
          changed_by: string
          changed_by_name: string
          changed_by_role: UserRole
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          from_status: ProjectStatus
          to_status: ProjectStatus
          changed_by: string
          changed_by_name: string
          changed_by_role: UserRole
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          from_status?: ProjectStatus
          to_status?: ProjectStatus
          changed_by?: string
          changed_by_name?: string
          changed_by_role?: UserRole
          reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_status_transitions_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_status_transitions_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      comments: {
        Row: {
          id: string
          entity_type: EntityType
          entity_id: string
          author_id: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_type: EntityType
          entity_id: string
          author_id: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entity_type?: EntityType
          entity_id?: string
          author_id?: string
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_auth_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      get_auth_factory_id: {
        Args: Record<string, never>
        Returns: string
      }
      is_company_director: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_assigned_pm: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      is_auth_active: {
        Args: Record<string, never>
        Returns: boolean
      }
      revoke_user_sessions: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_dashboard_stats: {
        Args: Record<string, never>
        Returns: {
          factory_count: number
          active_project_count: number
          average_progress: number
          blocked_task_count: number
          draft_count: number
          proposed_count: number
          in_progress_count: number
          overdue_task_count: number
        }[]
      }
      get_project_activity: {
        Args: { p_project_id: string }
        Returns: {
          id: string
          activity_kind: string
          entity_type: EntityType
          entity_id: string
          author_id: string
          body: string | null
          from_status: ProjectStatus | null
          to_status: ProjectStatus | null
          reason: string | null
          created_at: string
          updated_at: string
          author_full_name: string
          author_role: UserRole
        }[]
      }
      transition_project_status: {
        Args: {
          p_project_id: string
          p_target_status: ProjectStatus
          p_reason?: string | null
        }
        Returns: Database['public']['Tables']['projects']['Row']
      }
      create_comment: {
        Args: {
          p_entity_type: EntityType
          p_entity_id: string
          p_body: string
        }
        Returns: Database['public']['Tables']['comments']['Row']
      }
    }
    Enums: {
      user_role: UserRole
      project_status: ProjectStatus
      phase_status: PhaseStatus
      task_status: TaskStatus
      entity_type: EntityType
      duration_unit: DurationUnit
      cost_category: CostCategory
    }
    CompositeTypes: Record<string, never>
  }
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
export type Currency = Database['public']['Tables']['currencies']['Row']
export type CurrencyInsert =
  Database['public']['Tables']['currencies']['Insert']
export type CurrencyUpdate =
  Database['public']['Tables']['currencies']['Update']

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
