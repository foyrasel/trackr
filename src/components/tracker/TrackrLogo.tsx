'use client'

import React from 'react'

interface TrackrLogoProps {
  size?: number
  className?: string
}

export default function TrackrLogo({ size = 36, className }: TrackrLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="36" height="36" rx="10" fill="url(#trackr-grad)" />
      <path
        d="M7 25 L13 17 L19 21 L29 10"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="29" cy="10" r="2.8" fill="white" />
      <circle cx="7" cy="25" r="1.8" fill="rgba(255,255,255,0.55)" />
      <defs>
        <linearGradient id="trackr-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
    </svg>
  )
}
