import { useEffect, useState } from 'react'

interface Snowflake {
  id: number
  left: number
  animationDuration: number
  opacity: number
  size: number
  delay: number
}

export default function SnowEffect() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([])

  useEffect(() => {
    // Generate snowflakes only on client side to avoid hydration mismatch
    const count = 50
    const newSnowflakes: Snowflake[] = []

    for (let i = 0; i < count; i++) {
      newSnowflakes.push({
        id: i,
        left: Math.random() * 100, // percentage
        animationDuration: 5 + Math.random() * 10, // 5-15s
        opacity: 0.3 + Math.random() * 0.5, // 0.3-0.8
        size: 8 + Math.random() * 12, // 8-20px
        delay: Math.random() * 5, // 0-5s delay
      })
    }

    setSnowflakes(newSnowflakes)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden" aria-hidden="true">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake text-white absolute top-[-20px]"
          style={{
            left: `${flake.left}%`,
            animationDuration: `${flake.animationDuration}s`,
            animationDelay: `${flake.delay}s`,
            opacity: flake.opacity,
            fontSize: `${flake.size}px`,
          }}
        >
          ❄
        </div>
      ))}
    </div>
  )
}
