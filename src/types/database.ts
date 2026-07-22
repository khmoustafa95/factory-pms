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

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

export type EntityType = 'project' | 'phase' | 'task'

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
          title: string
          description: string | null
          status: ProjectStatus
          budget: number | null
          currency: string
          proposed_start_date: string | null
          proposed_end_date: string | null
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
          title: string
          description?: string | null
          status?: ProjectStatus
          budget?: number | null
          currency?: string
          proposed_start_date?: string | null
          proposed_end_date?: string | null
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
          title?: string
          description?: string | null
          status?: ProjectStatus
          budget?: number | null
          currency?: string
          proposed_start_date?: string | null
          proposed_end_date?: string | null
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
    }
    Enums: {
      user_role: UserRole
      project_status: ProjectStatus
      phase_status: PhaseStatus
      task_status: TaskStatus
      entity_type: EntityType
    }
    CompositeTypes: Record<string, never>
  }
}

export type Factory = Database['public']['Tables']['factories']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Phase = Database['public']['Tables']['phases']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
