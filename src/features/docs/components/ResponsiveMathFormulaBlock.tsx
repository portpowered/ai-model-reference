"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

const MOBILE_MATH_MEDIA_QUERY = "(max-width: 639px)";

function useIsMobileMathViewport() {
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MATH_MEDIA_QUERY);

    const updateViewport = (matches: boolean) => {
      setIsMobileViewport(matches);
    };

    updateViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      updateViewport(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isMobileViewport;
}

type ResponsiveMathFormulaBlockProps = {
  children: ReactNode;
  className?: string;
  formula: ReactNode;
  formulaId: string;
};

export function ResponsiveMathFormulaBlock({
  children,
  className,
  formula,
  formulaId,
}: ResponsiveMathFormulaBlockProps) {
  const definitionsPanelId = useId();
  const isMobileViewport = useIsMobileMathViewport();
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setIsExpanded(!isMobileViewport);
  }, [isMobileViewport]);

  const toggleExpanded = () => {
    setIsExpanded((current) => !current);
  };

  return (
    <div className={cn("flex min-w-0 max-w-full flex-col gap-3", className)}>
      {isMobileViewport ? (
        <button
          aria-controls={definitionsPanelId}
          aria-expanded={isExpanded}
          className="relative rounded-xl bg-background p-3 pr-9 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_figcaption]:pr-4"
          data-mobile-math-toggle={formulaId}
          onClick={toggleExpanded}
          type="button"
        >
          <span
            className="absolute top-3 right-3 text-muted-foreground"
            aria-hidden="true"
          >
            {isExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </span>
          {formula}
        </button>
      ) : (
        formula
      )}

      {isMobileViewport ? (
        isExpanded ? (
          <div id={definitionsPanelId}>{children}</div>
        ) : null
      ) : (
        children
      )}
    </div>
  );
}
