export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="aur" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#aur)" opacity="0.18" />
      <path
        d="M24 8c-7 9-12 14-12 22a12 12 0 0 0 24 0c0-8-5-13-12-22z"
        stroke="url(#aur)"
        strokeWidth="2.4"
        fill="none"
      />
      <circle cx="24" cy="30" r="3.5" fill="url(#aur)" />
    </svg>
  );
}
