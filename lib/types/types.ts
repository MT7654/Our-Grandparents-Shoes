import type { Database } from '@/supabase/types'

type Conversation = Database['public']['Tables']['conversations']['Row']
type DBScore = Database['public']['Tables']['scores']['Row']
type Evaluation = Database['public']['Tables']['evaluations']['Row']
type Badge = Database['public']['Tables']['badges']['Row']
type Achievement = Database['public']['Tables']['achievements']['Row']

export interface FullPersona {
    pid: string,
    name: string,
    age: number,
    personality: string,
    interests: string[],
    avatar_url: string
}

export interface Score {
    name: string,
    value: number
}

export type EndConversationEvaluation = {
  completed: Conversation['completed']
  objective_met: Conversation['objective_met']
  feedback: Conversation['feedback']
  scores: Score[]
}

export type CompleteParams = {
  scores: Record<DBScore['metric_name'], DBScore['metric_value']>,
  cid: Conversation['cid'],
  completed: Conversation['completed'],
  created_at: Conversation['created_at'],
  feedback: Conversation['feedback'],
  objective_met: Conversation['objective_met'],
  uid: Conversation['uid'],
  vid: Conversation['vid'],
  average: number,
}

export type MidConversationEvaluation = {
  sentiment: Evaluation['sentiment'],
  expression: Evaluation['expression'],
  rapportChange: Evaluation['rapport'],
  suggestion: Evaluation['suggestion']
}

export type DisplayBadge = {
  bid: Badge['bid'],
  name: Badge['name'],
  description: Badge['description'],
  category: Badge['category'],
  unlocked: boolean,
  awarded: Achievement['awarded_at']
}