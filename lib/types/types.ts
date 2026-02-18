import type { Database } from '@/supabase/types'
import scenarios from '../scenarios.json'
import personas from '../personas.json'

/** DB row types used for typing only */
type Conversation = Database['public']['Tables']['conversations']['Row']
type Message = Database['public']['Tables']['messages']['Row']
type DBScore = Database['public']['Tables']['scores']['Row']
type Evaluation = Database['public']['Tables']['evaluations']['Row']
type Badge = Database['public']['Tables']['badges']['Row']
type Achievement = Database['public']['Tables']['achievements']['Row']

/** Senior persona used in scenarios (name, age, personality, interests, avatar) */
export interface Persona {
    name: string,
    age: number,
    gender: string,
    personality: string,
    interests: string[],
    avatar: string
}

/** Single metric score (name + value) for end-of-conversation evaluation */
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
  suggestion: Evaluation['suggestion'],
  feedback: Message['feedback'],
  status: Message['status']
}

export type DisplayBadge = {
  bid: Badge['bid'],
  name: Badge['name'],
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

type Constraints = {
  starting_score: number;
  min_turns: number,
  max_turns: number;
  character_limit: number;
  score_bottom_limit: number;
  score_upper_limit: number;
}

/** Scenario definition: objective, instructions, constraints, persona, design, messages */
export interface Scenario {
    id: string,
    name: string,
    description: string,
    objective: string,
    instructions: string[],
    guidance: string[],
    design: Design,
    constraints: Constraints,
    persona: string,
    turn_end_message: string,
    score_end_message: string,
    starting_messages: string[]
}

export type ScenarioKeys = keyof typeof scenarios
export type PersonaKeys = keyof typeof personas
export type Guidance = "inline" | "bottom-bar"
export type Difficulty = "Easy" | "Hard"
export type Prompts = Record<string, Record<string, string[]>>