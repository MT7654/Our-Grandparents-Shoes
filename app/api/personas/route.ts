import { NextResponse, type NextRequest } from 'next/server'
import { fetchPersonas, fetchPersona } from '@/lib/personas/personas'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const personaId = searchParams.get("id")

        if (!personaId) {
            const personas = await fetchPersonas()

            if (!personas) {
                return NextResponse.json(
                    { error: "Failed to fetch personas" },
                    { status: 500 }
                )
            }

            return NextResponse.json(personas)
        } else {
            const persona = await fetchPersona(personaId)

            if (!persona) {
                return NextResponse.json(
                    { error: "Failed to fetch persona" },
                    { status: 500 }
                )
            }

            return NextResponse.json({ persona })
        }
    } catch (error) {
        console.error("API /personas error: ", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}