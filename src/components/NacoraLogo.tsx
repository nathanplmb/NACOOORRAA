import React from "react";

interface NacoraLogoProps {
  className?: string;
  variant?: "full" | "icon" | "wordmark";
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
  subtitle?: string;
}

/**
 * Official NACORA Brand Icon (Orbital Atom / Planet Mark)
 * Precision vector recreation of the official brand asset
 */
export const NacoraIcon: React.FC<{ className?: string; size?: number | string }> = ({
  className = "w-8 h-8",
  size
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="NACORA Icon"
    >
      {/* Outer Orbital Ring */}
      <circle
        cx="50"
        cy="50"
        r="38"
        stroke="#E11D48"
        strokeWidth="9"
        className="transition-colors"
      />

      {/* Inner Nucleus Core */}
      <circle
        cx="50"
        cy="50"
        r="17.5"
        fill="#881337"
      />

      {/* Satellite Orbital Dot (Top-Right on Ring at ~45deg) */}
      <circle
        cx="78"
        cy="22"
        r="10"
        fill="#881337"
      />
    </svg>
  );
};

/**
 * Official NACORA Wordmark ("nacora" with central dot in the 'o')
 */
export const NacoraWordmark: React.FC<{ className?: string; color?: string }> = ({
  className = "h-7",
  color = "#E11D48"
}) => {
  return (
    <svg
      viewBox="0 0 340 75"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="nacora"
    >
      {/* Letter 'n' */}
      <path
        d="M10 70V24C10 14 18 6 28 6C38 6 46 14 46 24V70"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Letter 'a' */}
      <path
        d="M102 24C102 14 94 6 82 6C70 6 62 14 62 24C62 34 70 42 82 42C94 42 102 34 102 24ZM102 18V70"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Letter 'c' */}
      <path
        d="M162 22C158 12 148 6 136 6C122 6 112 17 112 38C112 59 122 70 136 70C148 70 158 64 162 54"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Letter 'o' with center dot */}
      <circle
        cx="198"
        cy="38"
        r="32"
        stroke={color}
        strokeWidth="10"
      />
      <circle
        cx="198"
        cy="38"
        r="6.5"
        fill="#881337"
      />

      {/* Letter 'r' */}
      <path
        d="M246 70V24C246 14 254 6 264 6C272 6 278 10 280 14"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Letter 'a' */}
      <path
        d="M330 24C330 14 322 6 310 6C298 6 290 14 290 24C290 34 298 42 310 42C322 42 330 34 330 24ZM330 18V70"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Full NACORA Brand Logo (Icon + Wordmark + Subtitle option)
 */
export const NacoraLogo: React.FC<NacoraLogoProps> = ({
  className = "",
  variant = "full",
  size = "md",
  showSubtitle = false,
  subtitle = "Plateforme Carrière"
}) => {
  const sizeMap = {
    sm: { icon: "w-6 h-6", wordmark: "h-4", gap: "gap-2" },
    md: { icon: "w-8 h-8", wordmark: "h-5.5", gap: "gap-2.5" },
    lg: { icon: "w-10 h-10", wordmark: "h-7", gap: "gap-3" },
    xl: { icon: "w-14 h-14", wordmark: "h-9", gap: "gap-4" }
  };

  const currentSize = sizeMap[size];

  if (variant === "icon") {
    return <NacoraIcon className={`${currentSize.icon} ${className}`} />;
  }

  if (variant === "wordmark") {
    return <NacoraWordmark className={`${currentSize.wordmark} ${className}`} />;
  }

  return (
    <div className={`flex items-center ${currentSize.gap} ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        <NacoraIcon className={currentSize.icon} />
      </div>

      <div className="flex flex-col justify-center">
        <NacoraWordmark className={currentSize.wordmark} />
        {showSubtitle && subtitle && (
          <span className="text-[10px] text-[#9AA0B2] uppercase tracking-widest font-semibold mt-0.5 whitespace-nowrap">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
