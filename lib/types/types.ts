import type { Database } from '@/supabase/types'
import scenarios from '../scenarios.json'
import personas from '../personas.json'

type Conversation = Database['public']['Tables']['conversations']['Row']
type DBScore = Database['public']['Tables']['scores']['Row']
type Evaluation = Database['public']['Tables']['evaluations']['Row']
type Badge = Database['public']['Tables']['badges']['Row']
type Achievement = Database['public']['Tables']['achievements']['Row']

export interface Persona {
    name: string,
    age: number,
    personality: string,
    interests: string[],
    avatar: string
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
  scenario_name: Conversation['scenario_name'],
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

export interface Filters {
  volunteer_name?: string
  persona_name?: string
}

type Design = {
    icon: string;
    iconColor: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    buttonCta: string;

}

export interface Scenario {
    id: string,
    name: string,
    description: string,
    objective: string,
    instructions: string[],
    guidance: string[],
    design: Design,
    persona: string,
    max_turns: number,
}

export type ScenarioKeys = keyof typeof scenarios
export type PersonaKeys = keyof typeof personas
export type Guidance = "inline" | "bottom-bar"
export type Difficulty = "Easy" | "Hard"