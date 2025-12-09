import { createClient } from '@/lib/supabase/server'
import { type FullPersona } from '../types/types'

export const fetchPersonas = async () => {
    const supabase = await createClient()

    const { data: personas, error: personas_error } = await supabase
        .from('personas')
        .select('*')

    const { data: interests, error: interests_error } = await supabase
        .from('interests')
        .select('*')
    
    if (interests_error || personas_error) {
        console.error("Error fetching personas: ", interests_error, personas_error)
        return null
    }

    const interestMap = interests.reduce((acc, i) => {
        if (!acc[i.pid]) acc[i.pid] = []
        acc[i.pid].push(i.name)
        return acc
    }, {} as Record<string, string[]>)

    const data: FullPersona[] = personas.map((p) => ({
        ...p,
        interests: interestMap[p.pid] ?? []
    }))

    return data
}

export const fetchPersona = async (
    personaID: FullPersona['pid']
) => {
    const supabase = await createClient()

    const { data: persona, error: persona_error } = await supabase
        .from('personas')
        .select('*')
        .eq('pid', personaID)
        .single()

    const { data: interests, error: interests_error } = await supabase
        .from('interests')
        .select('*')
        .eq('pid', personaID)
    
    if (interests_error || persona_error) {
        console.error("Error fetching personas: ", interests_error, persona_error)
        return null
    }

    const formatted_intersts = interests.map(i => i.name)

    return {
        ...persona,
        interests: formatted_intersts
    } as FullPersona
}