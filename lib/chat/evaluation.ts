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
        console.error("Error saving evaluation: ", error)
        throw new Error(`Failed to save evaluation: ${error.message}`)
    }

    if (!data) {
        throw new Error(`Failed to save evaluation: No data returned`)
    }

    return data as Evaluation
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
        // PGRST116 means no rows found - this is expected, not an error
        if (error.code === 'PGRST116') {
            return null
        }
        console.error("Error fetching evaluation: ", error)
        throw new Error(`Failed to fetch evaluation: ${error.message}`)
    }

    return data as Evaluation
}