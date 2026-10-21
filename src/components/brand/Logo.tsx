import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string | undefined;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function BetrixLogo({ className, size = "md", showText = true }: LogoProps) {
  const sizes = {
    sm: { img: "h-7 w-7", font: "text-base tracking-wider" },
    md: { img: "h-9 w-9", font: "text-xl tracking-widest" },
    lg: { img: "h-14 w-14", font: "text-3xl tracking-widest" },
  };

  const current = sizes[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none group", className)}>
      <img
        src="/logo.jpg"
        alt="BETRIX"
        className={cn(
          "rounded-full object-cover shrink-0 border border-[#F5C400]/50 shadow-[0_0_12px_rgba(245,196,0,0.4)] group-hover:scale-105 transition-transform duration-200",
          current.img
        )}
      />
      {showText && (
        <span
          className={cn(
            "font-black text-[#F5C400] drop-shadow-[0_2px_6px_rgba(245,196,0,0.35)] uppercase",
            current.font
          )}
        >
          BETRIX
        </span>
      )}
    </span>
  );
}

export function BetrixWordmark({ className }: { className?: string }) {
  return <BetrixLogo className={className} size="md" />;
}

export function BetrixMark({ className }: { className?: string }) {
  return <BetrixLogo className={className} size="sm" showText={false} />;
}

export function PrimeStakersLogo({ className, size = "md" }: LogoProps) {
  return <BetrixLogo className={className} size={size} />;
}

