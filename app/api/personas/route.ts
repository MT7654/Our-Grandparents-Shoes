import { NextResponse, type NextRequest } from 'next/server'
import { fetchPersonas, fetchPersona } from '@/lib/personas/personas'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const personaId = searchParams.get("id")

        if (!personaId) {
            const personas = await fetchPersonas()
            return NextResponse.json(personas || [])
        } else {
            const persona = await fetchPersona(personaId)

            if (!persona) {
                return NextResponse.json(
                    { error: `Persona with ID "${personaId}" not found` },
                    { status: 404 }
                )
            }

            return NextResponse.json({ persona })
        }
    } catch (error) {
        console.error("GET /personas error: ", error)
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch personas"
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}