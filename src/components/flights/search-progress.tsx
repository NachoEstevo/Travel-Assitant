"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Sparkles, Search, BarChart3, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchStage = "parsing" | "searching" | "processing" | "complete";

interface SearchProgressProps {
  stage: SearchStage;
  isNaturalLanguage?: boolean;
}

const stages = [
  { id: "parsing", label: "Understanding your request", icon: Sparkles },
  { id: "searching", label: "Finding available flights", icon: Search },
  { id: "processing", label: "Analyzing best options", icon: BarChart3 },
  { id: "complete", label: "Ready to explore", icon: CheckCircle2 },
];

const stageIndex: Record<SearchStage, number> = {
  parsing: 0,
  searching: 1,
  processing: 2,
  complete: 3,
};

// Simple loading indicator for non-staged loading
export function SearchLoadingSimple() {
  return (
    <div className="py-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 mb-4">
        <Plane className="w-7 h-7 text-primary animate-float" />
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground mb-2">
        Searching flights...
      </h3>
      <p className="text-sm text-muted-foreground">
        This usually takes a few seconds
      </p>
    </div>
  );
}

export function SearchProgress({ stage, isNaturalLanguage = true }: SearchProgressProps) {
  const currentIndex = stageIndex[stage];
  const filteredStages = isNaturalLanguage
    ? stages
    : stages.filter((s) => s.id !== "parsing");

  return (
    <div className="py-12">
      <div className="max-w-lg mx-auto">
        {/* Header with animated plane */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 mb-4">
            <Plane className="w-7 h-7 text-primary animate-float" />
          </div>
          <h3 className="font-display text-xl font-semibold text-foreground">
            Finding your perfect flight
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            This usually takes a few seconds
          </p>
        </motion.div>

        {/* Progress bar */}
        <div className="relative mb-10 px-4">
          <div className="h-2 bg-muted/50 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-primary/90 to-primary rounded-full relative"
              initial={{ width: "0%" }}
              animate={{
                width: stage === "complete" ? "100%" : `${((currentIndex + 0.5) / (filteredStages.length - 1)) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </motion.div>
          </div>

          {/* Progress percentage */}
          <motion.div
            className="absolute -bottom-6 text-xs text-muted-foreground font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              left: stage === "complete" ? "100%" : `${((currentIndex + 0.5) / (filteredStages.length - 1)) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            {stage === "complete" ? "100%" : `${Math.round(((currentIndex + 0.5) / (filteredStages.length - 1)) * 100)}%`}
          </motion.div>
        </div>

        {/* Stages */}
        <div className="space-y-3 px-4">
          {filteredStages.map((s, index) => {
            const actualIndex = isNaturalLanguage ? index : index + 1;
            const isActive = stageIndex[stage] === actualIndex;
            const isComplete = stageIndex[stage] > actualIndex;
            const Icon = s.icon;

            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
                  isActive && "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-sm",
                  isComplete && "text-muted-foreground",
                  !isActive && !isComplete && "opacity-40"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300",
                    isActive && "bg-primary text-primary-foreground shadow-lg",
                    isComplete && "bg-green-500/15 text-green-600",
                    !isActive && !isComplete && "bg-muted/60 text-muted-foreground"
                  )}
                >
                  {isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isComplete ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={cn(
                      "font-medium text-sm",
                      isActive && "text-primary",
                      isComplete && "text-green-600"
                    )}
                  >
                    {s.label}
                  </p>
                </div>
                {isActive && (
                  <motion.div
                    className="flex gap-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-primary/60"
                        animate={{
                          scale: [1, 1.4, 1],
                          opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Complete state celebration */}
        {stage === "complete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Search complete
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
