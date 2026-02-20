interface CharCounterProps {
  current: number
  max: number
}

export function CharCounter({ current, max }: CharCounterProps) {
  const ratio = current / max
  const color =
    ratio > 1
      ? "text-red-500"
      : ratio > 0.9
        ? "text-[#F59E0B]"
        : "text-muted-foreground"

  return (
    <span className={`text-xs ${color}`}>
      {current}/{max}
    </span>
  )
}
