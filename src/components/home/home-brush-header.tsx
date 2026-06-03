type HomeBrushHeaderProps = {
  title: string;
  subtitle: string;
};

export function HomeBrushHeader({ title, subtitle }: HomeBrushHeaderProps) {
  return (
    <header className="relative mb-8 overflow-hidden rounded-lg px-6 py-10 sm:px-8 sm:py-12">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <svg
          className="h-full w-full"
          viewBox="0 0 800 220"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Decorative brush stroke background</title>
          <defs>
            <linearGradient
              id="brush-coral"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="oklch(0.74 0.105 21 / 0.55)" />
              <stop offset="100%" stopColor="oklch(0.74 0.105 21 / 0.15)" />
            </linearGradient>
            <linearGradient
              id="brush-cream"
              x1="100%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="oklch(0.88 0.04 82 / 0.35)" />
              <stop offset="100%" stopColor="oklch(0.88 0.04 82 / 0.08)" />
            </linearGradient>
            <linearGradient id="brush-teal" x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.45 0.04 205 / 0.4)" />
              <stop offset="100%" stopColor="oklch(0.45 0.04 205 / 0.1)" />
            </linearGradient>
          </defs>
          <path
            d="M-20 140 C 80 40, 200 20, 340 55 C 480 90, 560 30, 720 70 C 820 100, 860 160, 820 200 L -20 200 Z"
            fill="url(#brush-coral)"
          />
          <path
            d="M-10 160 C 120 80, 260 50, 400 95 C 520 130, 640 60, 800 110 L 800 210 L -10 210 Z"
            fill="url(#brush-cream)"
          />
          <path
            d="M0 175 C 150 120, 300 100, 450 130 C 600 160, 700 140, 820 165 L 820 215 L 0 215 Z"
            fill="url(#brush-teal)"
          />
          <path
            d="M40 90 C 160 30, 320 25, 480 50 C 620 70, 700 45, 780 65"
            fill="none"
            stroke="oklch(0.2 0.02 205 / 0.25)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-accent sm:text-xl">
        {subtitle}
      </p>
    </header>
  );
}
