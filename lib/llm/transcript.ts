// Models sometimes render a numeric reference as "line 2" or "2".
export function transcriptLineIndex(reference: unknown): number {
  if (typeof reference === "number" && Number.isInteger(reference)) return reference - 1
  const match = typeof reference === "string" && /^(?:line\s+)?([1-9]\d*)$/i.exec(reference.trim())
  return match ? Number(match[1]) - 1 : -1
}
