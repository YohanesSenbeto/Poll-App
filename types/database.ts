export interface Database {
  public: {
    Tables: {
      polls: {
        Row: {
          id: string
          question: string
          description: string | null
          user_id: string
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          question: string
          description?: string | null
          user_id?: string
          is_active?: boolean
        }
        Update: {
          question?: string
          description?: string | null
          is_active?: boolean
        }
      }
      options: {
        Row: {
          id: string
          poll_id: string
          text: string
          created_at: string
        }
        Insert: {
          poll_id: string
          text: string
        }
        Update: {
          text?: string
        }
      }
      votes: {
        Row: {
          id: string
          poll_id: string
          option_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          poll_id: string
          option_id: string
          user_id?: string
        }
        Update: {}
      }
    }
    Views: {
      poll_statistics: {
        Row: {
          id: string
          question: string
          description: string | null
          user_id: string
          created_at: string
          is_active: boolean
          total_votes: number
          total_options: number
        }
      }
    }
    Functions: {
      get_poll_results: {
        Args: {
          poll_uuid: string
        }
        Returns: Array<{
          option_id: string
          option_text: string
          vote_count: number
          percentage: number
        }>
      }
    }
  }
}

export type Poll = Database['public']['Tables']['polls']['Row']
export type PollInsert = Database['public']['Tables']['polls']['Insert']
export type PollUpdate = Database['public']['Tables']['polls']['Update']

export type Option = Database['public']['Tables']['options']['Row']
export type OptionInsert = Database['public']['Tables']['options']['Insert']

export type Vote = Database['public']['Tables']['votes']['Row']
export type VoteInsert = Database['public']['Tables']['votes']['Insert']

export type PollStatistics = Database['public']['Views']['poll_statistics']['Row']
export type PollResult = Database['public']['Functions']['get_poll_results']['Returns'][0]

export interface PollWithOptions extends Poll {
  options: Option[]
  total_votes: number
}

export interface PollWithResults extends Poll {
  options: Option[]
  results: PollResult[]
  total_votes: number
  user_has_voted: boolean
}