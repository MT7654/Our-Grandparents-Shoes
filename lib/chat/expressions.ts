export const expressionCues = {
  neutral: "Her face is relaxed.",
  happy: "She smiles, her eyes crinkling.",
  angry: "Her brows draw together and her lips tighten.",
  worried: "Her brows lift and pinch together.",
  confused: "She furrows her brow and parts her lips.",
  scared: "Her eyes widen and her mouth opens.",
} as const

export type Expression = keyof typeof expressionCues
export function isExpression(value: unknown): value is Expression {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(expressionCues, value)
}
