import React from 'react'

interface ProgressIndicatorProps {
  progress: number
  className?: string
}

export function ProgressIndicator({ progress, className }: ProgressIndicatorProps) {
  const circumference = 2 * Math.PI * 55 // Circle radius is 55

  return (
    <div className={`fixed bottom-8 right-8 z-50 transition-opacity duration-300 ${className}`}>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            className="text-gray-700 stroke-current"
            strokeWidth="8"
            cx="60"
            cy="60"
            r="55"
            fill="rgba(0, 0, 0, 0.5)"
          ></circle>
          {/* Progress circle */}
          <circle
            className="text-blue-500 stroke-current"
            strokeWidth="8"
            cx="60"
            cy="60"
            r="55"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (progress / 100) * circumference}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          ></circle>
          {/* Center text */}
          <text
            x="50%"
            y="50%"
            fontFamily="Verdana"
            fontSize="18"
            fontWeight="bold"
            textAnchor="middle"
            dy=".3em"
            fill="white"
          >
            {`${Math.round(progress)}%`}
          </text>
        </svg>
      </div>
    </div>
  )
}
