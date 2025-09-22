export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      polls: {
        Row: {
          id: string
          user_id: string | null
          title: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      options: {
        Row: {
          id: string
          poll_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          poll_id?: string
          text?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          }
        ]
      }
      votes: {
        Row: {
          id: string
          user_id: string
          poll_id: string
          option_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          poll_id: string
          option_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          poll_id?: string
          option_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      poll_statistics: {
        Row: {
          poll_id: string | null
          title: string | null
          description: string | null
          user_id: string | null
          is_active: boolean | null
          created_at: string | null
          option_count: number | null
          total_votes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      get_poll_results: {
        Args: {
          poll_uuid: string
        }
        Returns: {
          option_id: string
          option_text: string
          vote_count: number
          percentage: number
        }[]
      }
      "comments": {
        Row: {
          id: string
          poll_id: string
          user_id: string
          parent_id: string | null
          content: string
          is_edited: boolean
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          user_id: string
          parent_id?: string | null
          content: string
          is_edited?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          poll_id?: string
          user_id?: string
          parent_id?: string | null
          content?: string
          is_edited?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          }
        ]
      }
      "comment_votes": {
        Row: {
          id: string
          comment_id: string
          user_id: string
          vote_type: number
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          vote_type: number
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          vote_type?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}