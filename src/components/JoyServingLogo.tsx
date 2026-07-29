import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
}

export const JoyServingLogo: React.FC<LogoProps> = ({ className = '', variant = 'full' }) => {
  if (variant === 'icon') {
    // Elegant compact icon: "Joy" with the smiling rainbow under 'o'
    return (
      <svg
        viewBox="0 0 130 110"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="rainbow-grad-icon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="25%" stopColor="#4ADE80" />
            <stop offset="50%" stopColor="#FACC15" />
            <stop offset="75%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
        </defs>
        
        <g transform="translate(10, 80)">
          {/* J */}
          <text
            x="0"
            y="0"
            fill="#1C64F2"
            fontSize="76"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="-2"
          >
            J
          </text>
          {/* o */}
          <text
            x="38"
            y="0"
            fill="#1C64F2"
            fontSize="76"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="-2"
          >
            o
          </text>
          {/* y */}
          <text
            x="80"
            y="0"
            fill="#1C64F2"
            fontSize="76"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="-2"
          >
            y
          </text>
        </g>

        {/* Smiley Under the 'o' */}
        <path
          d="M 45 88 C 55 102, 75 102, 85 88"
          stroke="url(#rainbow-grad-icon)"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }

  // Full Word logo: "JoyServing" with the smiling rainbow under 'o'
  return (
    <svg
      viewBox="0 0 450 110"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id="rainbow-grad-full" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="25%" stopColor="#4ADE80" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="75%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#F87171" />
        </linearGradient>
      </defs>
      
      <g transform="translate(10, 80)">
        {/* J */}
        <text
          x="0"
          y="0"
          fill="#1C64F2"
          fontSize="76"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-2"
        >
          J
        </text>
        {/* o */}
        <text
          x="38"
          y="0"
          fill="#1C64F2"
          fontSize="76"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-2"
        >
          o
        </text>
        {/* y */}
        <text
          x="80"
          y="0"
          fill="#1C64F2"
          fontSize="76"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-2"
        >
          y
        </text>
        {/* Serving */}
        <text
          x="122"
          y="0"
          fill="#1C64F2"
          fontSize="76"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-2"
        >
          Serving
        </text>
      </g>

      {/* Smiley Under the 'o' */}
      <path
        d="M 45 88 C 55 102, 75 102, 85 88"
        stroke="url(#rainbow-grad-full)"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};
