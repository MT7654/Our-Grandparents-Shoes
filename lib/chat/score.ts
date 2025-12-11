import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/supabase/types'
import { type Score } from '@/lib/types/types'

type DBScore = Database['public']['Tables']['scores']['Row']

export const saveScores = async (
    converseID: DBScore['vid'],
    scores: Score[]
) => {
    const supabase = await createServiceClient()

    const rows = scores.map((s) => ({
        vid: converseID,
        metric_name: s.name,
        metric_value: s.value,
    }))

    const { data, error } = await supabase
        .from('scores')
        .upsert(rows, 
            {
                onConflict: ['vid', 'metric_name'] as any,
                ignoreDuplicates: false
            }
        )
        .select()
    
    if (error) {
        console.error('Error saving scores: ', error)
        throw new Error(`Failed to save scores: ${error.message}`)
    }
    
    return (data || []) as DBScore[]
}

export const getScores = async (
    converseID: DBScore['vid']
) => {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('vid', converseID)

    if (error) {
        console.error('Error retrieving scores: ', error)
        throw new Error(`Failed to fetch scores: ${error.message}`)
    }

    return (data || []) as DBScore[]
}