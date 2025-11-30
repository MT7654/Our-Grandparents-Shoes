import { cn } from "@/lib/utils"

interface HealthBarProps {
  value: number
  max?: number
  label?: string
  className?: string
}

export function HealthBar({ value, max = 100, label = "Rapport", className }: HealthBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const getColor = () => {
    if (percentage >= 70) return "bg-green-500"
    if (percentage >= 40) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {Math.round(value)}/{max}
        </span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        <div className={cn("h-full transition-all duration-300", getColor())} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
