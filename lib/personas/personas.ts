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
    
    if (personas_error) {
        console.error("Error fetching personas: ", personas_error)
        throw new Error(`Failed to fetch personas: ${personas_error.message}`)
    }

    if (interests_error) {
        console.error("Error fetching interests: ", interests_error)
        throw new Error(`Failed to fetch interests: ${interests_error.message}`)
    }

    const interestMap = (interests || []).reduce((acc, i) => {
        if (!acc[i.pid]) acc[i.pid] = []
        acc[i.pid].push(i.name)
        return acc
    }, {} as Record<string, string[]>)

    const data: FullPersona[] = (personas || []).map((p) => ({
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

    if (persona_error) {
        // PGRST116 means no rows found - this is a "not found" case, not an error
        if (persona_error.code === 'PGRST116') {
            return null
        }
        console.error("Error fetching persona: ", persona_error)
        throw new Error(`Failed to fetch persona: ${persona_error.message}`)
    }

    const { data: interests, error: interests_error } = await supabase
        .from('interests')
        .select('*')
        .eq('pid', personaID)
    
    if (interests_error) {
        console.error("Error fetching interests: ", interests_error)
        // If persona exists but interests fail, we can still return persona with empty interests
        return {
            ...persona,
            interests: []
        } as FullPersona
    }

    const formatted_intersts = (interests || []).map(i => i.name)

    return {
        ...persona,
        interests: formatted_intersts
    } as FullPersona
}