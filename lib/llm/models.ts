// Keep all conversation and evaluation paths on the same supported models.
// GPT-OSS needs room for reasoning as well as the final JSON; callers use
// low reasoning effort and larger completion budgets than the retired models.
export function getModelNames(): string[] {
  return [...new Set([
    process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-20b',
    process.env.GROQ_FALLBACK_MODEL?.trim() || 'openai/gpt-oss-120b',
  ])]
}
