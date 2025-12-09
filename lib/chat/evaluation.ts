import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/supabase/types'

type Evaluation = Database['public']['Tables']['evaluations']['Row']

export const saveEvaluation = async (
    converseID: Evaluation['vid'],
    sentiment: Evaluation['sentiment'],
    expression: Evaluation['expression'],
    rapport: Evaluation['rapport'],
    suggestion: Evaluation['suggestion']
) => {
    const supabase = await createServiceClient()

    const { data, error } = await supabase
        .from('evaluations')
        .upsert(
            [{
                vid: converseID,
                sentiment, 
                expression,
                rapport,
                suggestion,
            }],
            {
                onConflict: 'vid',
                ignoreDuplicates: false
            }
        )
        .select()
        .maybeSingle()
    
    if (error) {
        console.error("Error saving evaluations: ", error)
        return null
    }

    if (data) {
        return data as Evaluation
    } else {
        return null
    }
    
}

export const getEvaluation = async (
    converseID: Evaluation['vid']
) => {
    const supabase = await createServiceClient()

    const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('vid', converseID)
        .single()
    
    if (error) {
        console.error("Error saving evaluations: ", error)
        return null
    }

    return data as Evaluation
}