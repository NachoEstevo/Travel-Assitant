"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, Plane, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchStage = "parsing" | "searching" | "processing" | "complete";

interface SearchProgressProps {
  stage: SearchStage;
  isNaturalLanguage?: boolean;
}

const stages = [
  { id: "parsing", label: "Understanding your request", icon: Sparkles },
  { id: "searching", label: "Searching flights", icon: Search },
  { id: "processing", label: "Finding best options", icon: Plane },
  { id: "complete", label: "Done!", icon: CheckCircle2 },
] as const;

const stageIndex: Record<SearchStage, number> = {
  parsing: 0,
  searching: 1,
  processing: 2,
  complete: 3,
};

export function SearchProgress({ stage, isNaturalLanguage = true }: SearchProgressProps) {
  const currentIndex = stageIndex[stage];
  const filteredStages = isNaturalLanguage
    ? stages
    : stages.filter((s) => s.id !== "parsing");

  return (
    <div className="py-8">
      <div className="max-w-md mx-auto">
        {/* Progress bar */}
        <div className="relative mb-8">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{
                width: stage === "complete" ? "100%" : `${((currentIndex + 0.5) / (filteredStages.length - 1)) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Stages */}
        <div className="space-y-4">
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
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  isActive && "bg-primary/10 border border-primary/20",
                  isComplete && "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full transition-all",
                    isActive && "bg-primary text-primary-foreground",
                    isComplete && "bg-green-500/20 text-green-500",
                    !isActive && !isComplete && "bg-muted text-muted-foreground"
                  )}
                >
                  {isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isComplete ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={cn(
                      "font-medium",
                      isActive && "text-primary",
                      isComplete && "text-green-500"
                    )}
                  >
                    {s.label}
                  </p>
                </div>
                {isActive && (
                  <motion.div
                    className="flex gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Simple loading spinner with animated text
 */
export function SearchLoadingSimple({ stage }: { stage: SearchStage }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const stageLabels: Record<SearchStage, string> = {
    parsing: "Understanding your request",
    searching: "Searching flights",
    processing: "Finding best options",
    complete: "Done!",
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>
      <p className="text-lg font-medium">
        {stageLabels[stage]}
        <span className="inline-block w-6 text-left">{dots}</span>
      </p>
    </div>
  );
}
