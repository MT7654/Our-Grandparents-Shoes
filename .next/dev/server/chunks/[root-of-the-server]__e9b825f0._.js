module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/app/api/evaluate/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
;
const apiKey = ("TURBOPACK compile-time value", "sk-abcdijkl1234uvwxabcdijkl1234uvwxabcdijkl");
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
const openai = ("TURBOPACK compile-time truthy", 1) ? new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
    apiKey
}) : "TURBOPACK unreachable";
async function POST(request) {
    try {
        if (!openai || !apiKey) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "API key not configured. Please set NEXT_PUBLIC_OPENAI_API_KEY environment variable."
            }, {
                status: 500
            });
        }
        const body = await request.json();
        const { userMessage, personaResponse, objective } = body;
        if (!userMessage || !personaResponse) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "userMessage and personaResponse are required"
            }, {
                status: 400
            });
        }
        const evaluationPrompt = `You are an expert conversation coach evaluating a conversation between a user and a senior persona. Analyze the user's message and the persona's response.

User's message: "${userMessage}"
Persona's response: "${personaResponse}"
${objective ? `Training objective: "${objective}"` : ""}

Evaluate the conversation and provide:
1. Sentiment: "positive", "neutral", or "negative" - based on how the user's message would make the senior feel
2. Expression: "happy", "neutral", "sad", or "angry" - the emotional expression the senior would show
3. Rapport change: a number between -10 and +15 indicating how much the rapport improved or worsened
4. Suggestion: a helpful coaching tip (1-2 sentences) for the user to improve their conversation skills

Respond ONLY with a valid JSON object in this exact format:
{
  "sentiment": "positive|neutral|negative",
  "expression": "happy|neutral|sad|angry",
  "rapportChange": <number>,
  "suggestion": "<coaching tip>"
}`;
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an expert conversation coach. Always respond with valid JSON only, no additional text."
                },
                {
                    role: "user",
                    content: evaluationPrompt
                }
            ],
            temperature: 0.3,
            max_tokens: 200,
            response_format: {
                type: "json_object"
            }
        });
        const text = completion.choices[0]?.message?.content || "{}";
        // Parse JSON response
        let evaluation;
        try {
            evaluation = JSON.parse(text);
        } catch (parseError) {
            // Try to extract JSON if wrapped in text
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                evaluation = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Could not parse JSON from AI response");
            }
        }
        // Validate and normalize the response
        const validSentiments = [
            "positive",
            "neutral",
            "negative"
        ];
        const validExpressions = [
            "happy",
            "neutral",
            "sad",
            "angry"
        ];
        if (!validSentiments.includes(evaluation.sentiment)) {
            evaluation.sentiment = "neutral";
        }
        if (!validExpressions.includes(evaluation.expression)) {
            evaluation.expression = "neutral";
        }
        if (typeof evaluation.rapportChange !== "number") {
            evaluation.rapportChange = 0;
        } else {
            evaluation.rapportChange = Math.max(-10, Math.min(15, Math.round(evaluation.rapportChange)));
        }
        if (!evaluation.suggestion || typeof evaluation.suggestion !== "string") {
            evaluation.suggestion = "Continue showing genuine interest and empathy in the conversation.";
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(evaluation);
    } catch (error) {
        console.error("Error evaluating conversation:", error);
        // Return a default evaluation on error
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            sentiment: "neutral",
            expression: "neutral",
            rapportChange: 0,
            suggestion: "Continue showing genuine interest and empathy in the conversation."
        }, {
            status: 200
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e9b825f0._.js.map