import React from 'react';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
}) => {
  const sizeMap = {
    xs: { box: 'w-7 h-7', svg: 28 },
    sm: { box: 'w-9 h-9', svg: 36 },
    md: { box: 'w-12 h-12', svg: 48 },
    lg: { box: 'w-16 h-16', svg: 64 },
    xl: { box: 'w-20 h-20', svg: 80 },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center space-x-3 ${className}`}>
      {/* Official State Emblem Icon */}
      <div 
        className={`${currentSize.box} rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 p-0.5 shadow-md shadow-blue-900/25 border border-blue-400/20 flex items-center justify-center shrink-0 relative overflow-hidden group select-none`}
        title="Trésorerie De La Préfecture De Djibouti • Registre CG & PC"
      >
        {/* Subtle decorative glow */}
        <div className="absolute inset-0 bg-radial from-blue-400/20 to-transparent pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>

        <svg 
          viewBox="0 0 512 512" 
          className="w-full h-full p-1"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shield Outline with National Djibouti Blue & Emerald Green Gradient */}
          <path 
            d="M 256,58 C 344,58 412,86 412,86 C 412,246 348,374 256,438 C 164,374 100,246 100,86 C 100,86 168,58 256,58 Z" 
            fill="#0b1b36" 
            stroke="url(#appLogoBorder)" 
            strokeWidth="14" 
            strokeLinejoin="round" 
          />

          {/* Star of Djibouti at Crest */}
          <g transform="translate(256, 126)">
            <circle r="36" fill="#ef4444" opacity="0.35" />
            <polygon 
              points="0,-26 7.8,-8 26.6,-8 11.4,3.2 17.2,21.6 0,9.6 -17.2,21.6 -11.4,3.2 -26.6,-8 -7.8,-8" 
              fill="#dc2626" 
              stroke="#ffffff" 
              strokeWidth="3" 
              strokeLinejoin="round" 
            />
          </g>

          {/* Car Silhouette (Carte Grise) */}
          <g transform="translate(196, 252)">
            <path 
              d="M -70,22 C -68,14 -60,6 -50,6 L -30,6 L -15,-20 C -12,-26 -4,-30 4,-30 L 50,-30 C 58,-30 64,-26 68,-20 L 82,6 L 94,6 C 102,6 108,12 108,20 L 108,34 C 108,38 104,42 100,42 L 94,42 C 94,34 86,26 76,26 C 66,26 58,34 58,42 L -18,42 C -18,34 -26,26 -36,26 C -46,26 -54,34 -54,42 L -66,42 C -70,42 -74,38 -74,34 Z" 
              fill="#38bdf8" 
            />
            <path d="M -10,-18 L -24,4 L 14,4 L 14,-22 L 4,-22 C 0,-22 -6,-20 -10,-18 Z" fill="#0f2b5c" />
            <path d="M 24,-22 L 24,4 L 72,4 L 60,-18 C 58,-21 54,-22 50,-22 Z" fill="#0f2b5c" />
            <circle cx="-36" cy="42" r="14" fill="#0b1324" stroke="#60a5fa" strokeWidth="4" />
            <circle cx="-36" cy="42" r="5" fill="#ffffff" />
            <circle cx="76" cy="42" r="14" fill="#0b1324" stroke="#60a5fa" strokeWidth="4" />
            <circle cx="76" cy="42" r="5" fill="#ffffff" />
            <polygon points="98,18 106,18 102,26 96,26" fill="#fef08a" />
          </g>

          {/* Permis de Conduire Smart Card */}
          <g transform="translate(320, 290)">
            <rect x="-60" y="-42" width="120" height="84" rx="10" fill="#ffffff" stroke="#10b981" strokeWidth="6" />
            <path d="M -58,-32 C -58,-38 -54,-40 -48,-40 L 48,-40 C 54,-40 58,-38 58,-32 L 58,-22 L -58,-22 Z" fill="#10b981" />
            <circle cx="-32" cy="-2" r="11" fill="#0284c7" />
            <path d="M -46,24 C -46,14 -38,13 -32,13 C -26,13 -18,14 -18,24 Z" fill="#0284c7" />
            <line x1="-8" y1="-8" x2="44" y2="-8" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
            <line x1="-8" y1="2" x2="36" y2="2" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            <line x1="-8" y1="12" x2="28" y2="12" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            <rect x="26" y="16" width="18" height="14" rx="3" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
            <line x1="35" y1="16" x2="35" y2="30" stroke="#ca8a04" strokeWidth="1.5" />
            <line x1="26" y1="23" x2="44" y2="23" stroke="#ca8a04" strokeWidth="1.5" />
          </g>

          {/* Gold Banner with CG • PC Label */}
          <g transform="translate(256, 388)">
            <rect x="-82" y="-18" width="164" height="36" rx="18" fill="#0f172a" stroke="#facc15" strokeWidth="4" />
            <text 
              x="0" 
              y="7" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontSize="20" 
              fontWeight="900" 
              fill="#fef08a" 
              letterSpacing="3" 
              textAnchor="middle"
            >
              CG • PC
            </text>
          </g>

          <defs>
            <linearGradient id="appLogoBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
            Registre CG & PC
          </h1>
          <p className="text-[11px] text-slate-500 font-semibold tracking-wide uppercase">
            Trésorerie De La Préfecture De Djibouti
          </p>
        </div>
      )}
    </div>
  );
};
