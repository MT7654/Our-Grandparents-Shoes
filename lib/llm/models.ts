// Keep all conversation and evaluation paths on the same supported models.
// GPT-OSS needs room for reasoning as well as the final JSON; callers use
// low reasoning effort and larger completion budgets than the retired models.
const cooldown = new Map<string,number>()
export function modelOptions(model:string,effort:"low"|"medium"="low"){
  return model.startsWith("qwen/") ? {reasoning_effort:"none" as const} : {reasoning_effort:effort,include_reasoning:false}
}
export function outputBudget(model:string,requested:number,compact:number) {
  return model.startsWith("qwen/") ? Math.min(requested,compact) : requested
}
export function noteRateLimit(model:string,err:unknown){
  if(typeof err === "object" && err !== null && "status" in err && err.status===429) cooldown.set(model,Date.now()+60_000)
}
export function getModelNames(): string[] {
  return [...new Set([
    process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-20b',
    process.env.GROQ_FALLBACK_MODEL?.trim() || 'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
  ])].sort((a,b) => Number((cooldown.get(a) ?? 0)>Date.now())-Number((cooldown.get(b) ?? 0)>Date.now()))
}
