"use client"

import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export type Expression = "happy" | "neutral" | "sad" | "angry"

interface AvatarWithExpressionProps {
  name: string
  expression: Expression
  className?: string
}

const expressionEmojis: Record<Expression, string> = {
  happy: "😊",
  neutral: "😐",
  sad: "😢",
  angry: "😠",
}

export function AvatarWithExpression({ name, expression, className }: AvatarWithExpressionProps) {
  const getAvatarQuery = () => {
    const queries: Record<Expression, string> = {
      happy: "elderly+person+cartoon+avatar+happy+smiling",
      neutral: "elderly+person+cartoon+avatar+neutral+calm",
      sad: "elderly+person+cartoon+avatar+sad+concerned",
      angry: "elderly+person+cartoon+avatar+upset+frustrated",
    }
    return queries[expression]
  }

  return (
    <div className={cn("relative", className)}>
      <Avatar className="w-16 h-16 border-2 border-border">
        <img
          src={`/.jpg?height=64&width=64&query=${getAvatarQuery()}`}
          alt={name}
          className="object-cover"
        />
      </Avatar>
      <div className="absolute -bottom-1 -right-1 text-2xl bg-background rounded-full border-2 border-border w-8 h-8 flex items-center justify-center">
        {expressionEmojis[expression]}
      </div>
    </div>
  )
}
