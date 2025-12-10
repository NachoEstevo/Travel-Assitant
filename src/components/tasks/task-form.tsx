"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plane, Calendar, Users, Bell, Clock, Loader2 } from "lucide-react";
import { CRON_PRESETS } from "@/lib/cron-utils";
import type { TaskData } from "./task-card";

const taskFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  origin: z.string().length(3, "Enter 3-letter airport code"),
  destination: z.string().length(3, "Enter 3-letter airport code"),
  departureDate: z.string().min(1, "Departure date is required"),
  returnDate: z.string().optional(),
  adults: z.number().min(1).max(9),
  travelClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]),
  cronExpr: z.string().min(1, "Schedule is required"),
  priceTarget: z.number().positive().optional().or(z.literal("")),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<TaskFormData, "priceTarget"> & { priceTarget?: number }) => Promise<void>;
  editTask?: TaskData | null;
}

export function TaskForm({ open, onOpenChange, onSubmit, editTask }: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get tomorrow's date as min date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: editTask
      ? {
          name: editTask.name,
          origin: editTask.origin,
          destination: editTask.destination,
          departureDate: editTask.departureDate,
          returnDate: editTask.returnDate || "",
          adults: editTask.adults,
          travelClass: editTask.travelClass as TaskFormData["travelClass"],
          cronExpr: editTask.cronExpr,
          priceTarget: editTask.priceTarget || "",
        }
      : {
          name: "",
          origin: "",
          destination: "",
          departureDate: "",
          returnDate: "",
          adults: 1,
          travelClass: "ECONOMY",
          cronExpr: "0 9 * * *",
          priceTarget: "",
        },
  });

  const handleSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        origin: data.origin.toUpperCase(),
        destination: data.destination.toUpperCase(),
        priceTarget: data.priceTarget ? Number(data.priceTarget) : undefined,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Form submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editTask ? "Edit Task" : "Schedule Flight Search"}
          </DialogTitle>
          <DialogDescription>
            Set up a recurring search to track prices over time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="e.g., Tokyo Summer Trip"
              disabled={isSubmitting}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Origin & Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">From</Label>
              <div className="relative">
                <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rotate-[-45deg]" />
                <Input
                  id="origin"
                  {...form.register("origin")}
                  placeholder="EZE"
                  className="pl-10 uppercase font-mono"
                  maxLength={3}
                  disabled={isSubmitting}
                />
              </div>
              {form.formState.errors.origin && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.origin.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">To</Label>
              <div className="relative">
                <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rotate-45" />
                <Input
                  id="destination"
                  {...form.register("destination")}
                  placeholder="NRT"
                  className="pl-10 uppercase font-mono"
                  maxLength={3}
                  disabled={isSubmitting}
                />
              </div>
              {form.formState.errors.destination && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.destination.message}
                </p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureDate">Departure</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="departureDate"
                  type="date"
                  {...form.register("departureDate")}
                  min={minDate}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              {form.formState.errors.departureDate && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.departureDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnDate">Return (optional)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="returnDate"
                  type="date"
                  {...form.register("returnDate")}
                  min={form.watch("departureDate") || minDate}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Passengers & Class */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adults">Passengers</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Select
                  value={form.watch("adults").toString()}
                  onValueChange={(v) => form.setValue("adults", parseInt(v))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} Adult{n > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="travelClass">Class</Label>
              <Select
                value={form.watch("travelClass")}
                onValueChange={(v) =>
                  form.setValue("travelClass", v as TaskFormData["travelClass"])
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ECONOMY">Economy</SelectItem>
                  <SelectItem value="PREMIUM_ECONOMY">Premium Economy</SelectItem>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                  <SelectItem value="FIRST">First Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label htmlFor="cronExpr">Check Schedule</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Select
                value={form.watch("cronExpr")}
                onValueChange={(v) => form.setValue("cronExpr", v)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="pl-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price Target */}
          <div className="space-y-2">
            <Label htmlFor="priceTarget">Price Alert (optional)</Label>
            <div className="relative">
              <Bell className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="priceTarget"
                type="number"
                {...form.register("priceTarget", { valueAsNumber: true })}
                placeholder="e.g., 800"
                className="pl-10"
                disabled={isSubmitting}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Get notified when the price drops below this amount.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editTask ? "Saving..." : "Creating..."}
                </>
              ) : editTask ? (
                "Save Changes"
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
