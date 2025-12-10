"use client";

interface FlightCardSkeletonProps {
  index?: number;
}

export function FlightCardSkeleton({ index = 0 }: FlightCardSkeletonProps) {
  const staggerClass = `stagger-${Math.min(index + 1, 10)}`;

  return (
    <div
      className={`animate-slide-up ${staggerClass} relative overflow-hidden rounded-xl bg-card border border-border`}
    >
      {/* Boarding pass notches */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-10 bg-background rounded-r-full -ml-2.5 z-10" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-10 bg-background rounded-l-full -mr-2.5 z-10" />

      <div className="flex">
        {/* Main flight info section */}
        <div className="flex-1 p-5">
          {/* Airlines skeleton */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-20 animate-shimmer rounded" />
            <div className="h-5 w-16 animate-shimmer rounded" />
          </div>

          {/* Flight leg skeleton */}
          <div className="flex items-center gap-4">
            {/* Departure */}
            <div className="text-center min-w-[70px] space-y-2">
              <div className="h-7 w-16 animate-shimmer rounded mx-auto" />
              <div className="h-5 w-10 animate-shimmer rounded mx-auto" />
              <div className="h-3 w-14 animate-shimmer rounded mx-auto" />
            </div>

            {/* Flight path */}
            <div className="flex-1 flex flex-col items-center gap-2 px-2">
              <div className="h-3 w-12 animate-shimmer rounded" />
              <div className="w-full h-px bg-border relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 animate-shimmer rounded-full" />
              </div>
              <div className="h-3 w-10 animate-shimmer rounded" />
            </div>

            {/* Arrival */}
            <div className="text-center min-w-[70px] space-y-2">
              <div className="h-7 w-16 animate-shimmer rounded mx-auto" />
              <div className="h-5 w-10 animate-shimmer rounded mx-auto" />
              <div className="h-3 w-14 animate-shimmer rounded mx-auto" />
            </div>
          </div>
        </div>

        {/* Perforation divider */}
        <div className="w-px perforation-vertical my-4" />

        {/* Price section skeleton */}
        <div className="w-36 p-5 flex flex-col items-center justify-center">
          <div className="h-3 w-10 animate-shimmer rounded mb-2" />
          <div className="h-9 w-20 animate-shimmer rounded" />
          <div className="h-3 w-8 animate-shimmer rounded mt-2" />
          <div className="h-9 w-full animate-shimmer rounded mt-4" />
        </div>
      </div>

      {/* Bottom bar skeleton */}
      <div className="px-5 py-2.5 bg-muted/30 border-t border-border flex items-center justify-between">
        <div className="h-3 w-28 animate-shimmer rounded" />
        <div className="h-3 w-16 animate-shimmer rounded" />
      </div>
    </div>
  );
}
