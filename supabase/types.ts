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
    PostgrestVersion: "13.0.5"
  }
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
      visit_assignments: {
        Row: {
          id: string
          cohort_id: string
          scenarios: Database["public"]["Enums"]["scenario_name"][]
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          due_date: string
        }
        Insert: {
          id?: string
          cohort_id: string
          scenarios: Database["public"]["Enums"]["scenario_name"][]
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          due_date: string
        }
        Update: {
          id?: string
          cohort_id?: string
          scenarios?: Database["public"]["Enums"]["scenario_name"][]
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          due_date?: string
        }
        Relationships: []
      }
      visit_cohorts: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      visit_memberships: {
        Row: {
          id: string
          cohort_id: string
          uid: string
          joined_at: string
          left_at: string | null
        }
        Insert: {
          id?: string
          cohort_id: string
          uid: string
          joined_at?: string
          left_at?: string | null
        }
        Update: {
          id?: string
          cohort_id?: string
          uid?: string
          joined_at?: string
          left_at?: string | null
        }
        Relationships: []
      }
      visit_recipients: {
        Row: {
          assignment_id: string
          uid: string
        }
        Insert: {
          assignment_id: string
          uid: string
        }
        Update: {
          assignment_id?: string
          uid?: string
        }
        Relationships: []
      }
      visit_reflections: {
        Row: {
          vid: string
          body: string
        }
        Insert: {
          vid: string
          body: string
        }
        Update: {
          vid?: string
          body?: string
        }
        Relationships: []
      }
      visit_retries: {
        Row: {
          id: string
          vid: string
          choice: string
          outcome: string
          created_at: string
        }
        Insert: {
          id: string
          vid: string
          choice: string
          outcome: string
          created_at?: string
        }
        Update: {
          id?: string
          vid?: string
          choice?: string
          outcome?: string
          created_at?: string
        }
        Relationships: []
      }
      visit_turns: {
        Row: {
          id: string
          vid: string
          reply_id: string
          version: number
          action_label: string | null
          scene_event: string | null
          evaluated: boolean
          submitted_at: string
        }
        Insert: {
          id: string
          vid: string
          reply_id: string
          version?: number
          action_label?: string | null
          scene_event?: string | null
          evaluated?: boolean
          submitted_at?: string
        }
        Update: {
          id?: string
          vid?: string
          reply_id?: string
          version?: number
          action_label?: string | null
          scene_event?: string | null
          evaluated?: boolean
          submitted_at?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          awarded_at: string
          bid: string
          uid: string
        }
        Insert: {
          awarded_at?: string
          bid: string
          uid: string
        }
        Update: {
          awarded_at?: string
          bid?: string
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_bid_fkey"
            columns: ["bid"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["bid"]
          },
        ]
      }
      badges: {
        Row: {
          bid: string
          label: Database["public"]["Enums"]["badge_type"]
          name: string
        }
        Insert: {
          bid?: string
          label: Database["public"]["Enums"]["badge_type"]
          name: string
        }
        Update: {
          bid?: string
          label?: Database["public"]["Enums"]["badge_type"]
          name?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          practice_context: string
          completed: boolean
          created_at: string
          end_reason: "objective_met" | "boundary" | "turn_limit" | "ended_early" | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          feedback: string
          objective_met: boolean
          scenario_name: Database["public"]["Enums"]["scenario_name"]
          turns: number
          uid: string
          vid: string
        }
        Insert: {
          practice_context?: string
          completed?: boolean
          created_at?: string
          end_reason?: "objective_met" | "boundary" | "turn_limit" | "ended_early" | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          feedback?: string
          objective_met?: boolean
          scenario_name: Database["public"]["Enums"]["scenario_name"]
          turns: number
          uid?: string
          vid?: string
        }
        Update: {
          practice_context?: string
          completed?: boolean
          created_at?: string
          end_reason?: "objective_met" | "boundary" | "turn_limit" | "ended_early" | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          feedback?: string
          objective_met?: boolean
          scenario_name?: Database["public"]["Enums"]["scenario_name"]
          turns?: number
          uid?: string
          vid?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          eid: string
          expression: Database["public"]["Enums"]["eval_new_expression"]
          rapport: number
          sentiment: Database["public"]["Enums"]["eval_sentiment"]
          suggestion: string
          vid: string
        }
        Insert: {
          eid?: string
          expression?: Database["public"]["Enums"]["eval_new_expression"]
          rapport?: number
          sentiment?: Database["public"]["Enums"]["eval_sentiment"]
          suggestion?: string
          vid: string
        }
        Update: {
          eid?: string
          expression?: Database["public"]["Enums"]["eval_new_expression"]
          rapport?: number
          sentiment?: Database["public"]["Enums"]["eval_sentiment"]
          suggestion?: string
          vid?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_vid_fkey"
            columns: ["vid"]
            isOneToOne: true
            referencedRelation: "conversation_sessions"
            referencedColumns: ["vid"]
          },
          {
            foreignKeyName: "evaluations_vid_fkey"
            columns: ["vid"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["vid"]
          },
          {
            foreignKeyName: "evaluations_vid_fkey"
            columns: ["vid"]
            isOneToOne: true
            referencedRelation: "review_sessions"
            referencedColumns: ["vid"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          feedback: string | null
          mid: string
          sender: Database["public"]["Enums"]["message_sender"]
          sent_at: string
          status: Database["public"]["Enums"]["message_status"] | null
          vid: string
        }
        Insert: {
          content: string
          feedback?: string | null
          mid?: string
          sender: Database["public"]["Enums"]["message_sender"]
          sent_at?: string
          status?: Database["public"]["Enums"]["message_status"] | null
          vid: string
        }
        Update: {
          content?: string
          feedback?: string | null
          mid?: string
          sender?: Database["public"]["Enums"]["message_sender"]
          sent_at?: string
          status?: Database["public"]["Enums"]["message_status"] | null
          vid?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_vid_fkey"
            columns: ["vid"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["vid"]
          },
          {
            foreignKeyName: "messages_vid_fkey"
            columns: ["vid"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["vid"]
          },
          {
            foreignKeyName: "messages_vid_fkey"
            columns: ["vid"]
            isOneToOne: false
            referencedRelation: "review_sessions"
            referencedColumns: ["vid"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: number
          last_active: string | null
          no_of_sessions: number | null
          role: Database["public"]["Enums"]["Roles"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: number
          last_active?: string | null
          no_of_sessions?: number | null
          role?: Database["public"]["Enums"]["Roles"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: number
          last_active?: string | null
          no_of_sessions?: number | null
          role?: Database["public"]["Enums"]["Roles"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      scores: {
        Row: {
          metric_name: string
          metric_value: number
          sid: string
          vid: string
        }
        Insert: {
          metric_name: string
          metric_value?: number
          sid?: string
          vid: string
        }
        Update: {
          metric_name?: string
          metric_value?: number
          sid?: string
          vid?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_vid_fkey"
            columns: ["vid"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["vid"]
          },
          {
            foreignKeyName: "scores_vid_fkey"
            columns: ["vid"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["vid"]
          },
          {
            foreignKeyName: "scores_vid_fkey"
            columns: ["vid"]
            isOneToOne: false
            referencedRelation: "review_sessions"
            referencedColumns: ["vid"]
          },
        ]
      }
    }
    Views: {
      visit_assignment_status: {
        Row: {
          assignment_id: string | null
          uid: string | null
          due_date: string | null
          scenarios: Database["public"]["Enums"]["scenario_name"][] | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          completed: boolean | null
          started: boolean | null
          last_practice: string | null
        }
        Relationships: []
      }
      conversation_sessions: {
        Row: {
          created_at: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          objective_met: boolean | null
          scenario_name: Database["public"]["Enums"]["scenario_name"] | null
          vid: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          objective_met?: boolean | null
          scenario_name?: Database["public"]["Enums"]["scenario_name"] | null
          vid?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          objective_met?: boolean | null
          scenario_name?: Database["public"]["Enums"]["scenario_name"] | null
          vid?: string | null
        }
        Relationships: []
      }
      review_sessions: {
        Row: {
          content: string | null
          created_at: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          feedback: string | null
          objective_met: boolean | null
          status: Database["public"]["Enums"]["message_status"] | null
          vid: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      is_admin: { Args: { uid: string }; Returns: boolean }
    }
    Enums: {
      badge_category: "Progression" | "Skill"
      badge_criteria:
        | "Active Listening"
        | "Empathy"
        | "Conversational Flow"
        | "Clarity"
        | "Conversation Count"
        | "Session Count"
      badge_type: "First Convo" | "All Scenarios" | "All Hard"
      difficulty_level: "Easy" | "Hard"
      eval_new_expression:
        | "neutral"
        | "happy"
        | "angry"
        | "worried"
        | "confused"
        | "scared"
      eval_sentiment: "positive" | "neutral" | "negative"
      message_sender: "user" | "persona"
      message_status: "good" | "normal" | "needs improvement"
      Roles: "user" | "admin"
      scenario_name:
        | "House Visit"
        | "Emotional Listening Ear"
        | "Resolve a Task"
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
      badge_category: ["Progression", "Skill"],
      badge_criteria: [
        "Active Listening",
        "Empathy",
        "Conversational Flow",
        "Clarity",
        "Conversation Count",
        "Session Count",
      ],
      badge_type: ["First Convo", "All Scenarios", "All Hard"],
      difficulty_level: ["Easy", "Hard"],
      eval_new_expression: [
        "neutral",
        "happy",
        "angry",
        "worried",
        "confused",
        "scared",
      ],
      eval_sentiment: ["positive", "neutral", "negative"],
      message_sender: ["user", "persona"],
      message_status: ["good", "normal", "needs improvement"],
      Roles: ["user", "admin"],
      scenario_name: [
        "House Visit",
        "Emotional Listening Ear",
        "Resolve a Task",
      ],
    },
  },
} as const
