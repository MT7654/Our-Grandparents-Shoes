import { NextResponse, type NextRequest } from 'next/server'
import { guard } from '@/lib/auth/guard'
import scenarios from '@/lib/scenarios.json'
import personas from '@/lib/personas.json'
import { type ScenarioKeys, PersonaKeys, Scenario, Persona } from '@/lib/types/types'

/**
 * GET /api/scenarios
 * Query: optional name=<scenarioKey>
 * Returns list of all scenarios, or single scenario + persona when name is provided.
 */
export async function GET(request: NextRequest) {
    try {
        const guardResult = await guard('user')

        if (guardResult instanceof NextResponse) {
            return guardResult
        }
        
        const { searchParams } = new URL(request.url)
        const scenarioName = searchParams.get("name")

        if (scenarioName) {
            if (scenarioName in scenarios) {
                const scenario: Scenario = scenarios[scenarioName as ScenarioKeys]
                const persona: Persona = personas[scenario.persona as PersonaKeys]

                return NextResponse.json({ scenario, persona })
            } else {
                console.error("GET /scenarios error: No Scenario Found")
                return NextResponse.json(
                    { error: 'No Scenario Found' },
                    { status: 404 }
                )
            }
            
        } else {
            const scenario_list = Object.values(scenarios).reduce((acc, obj) => {
                acc.push(obj)
                return acc
            }, [] as Scenario[])
            
            return NextResponse.json({ scenario: scenario_list })
        }
        
    } catch (error) {
        console.error('GET /scenarios error: ', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch scenario'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}