"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCard, TaskCardSkeleton, TaskForm, TaskData, TaskDetailDialog } from "@/components/tasks";
import { Plus, Bell, Clock, RefreshCw, Loader2 } from "lucide-react";

export default function TasksPage() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [prefillTask, setPrefillTask] = useState<Partial<TaskData> | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Handle create from history page
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      const prefillData = sessionStorage.getItem("createTaskFrom");
      if (prefillData) {
        try {
          const data = JSON.parse(prefillData);
          setPrefillTask({
            name: data.name || "",
            origin: data.origin || "",
            destination: data.destination || "",
            departureDate: data.departureDate || "",
            returnDate: data.returnDate || undefined,
          } as Partial<TaskData>);
          setIsFormOpen(true);
        } catch (e) {
          console.error("Failed to parse prefill data:", e);
        }
        sessionStorage.removeItem("createTaskFrom");
      } else {
        setIsFormOpen(true);
      }
      // Clear the query param from URL
      window.history.replaceState({}, "", "/tasks");
    }
  }, [searchParams]);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch tasks");
      }

      setTasks(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTasks();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      setTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...task, active } : task))
      );
    } catch (err) {
      console.error("Toggle task error:", err);
    }
  };

  const handleRun = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}/run`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to run task");
      }

      // Refresh tasks to get updated price info
      await fetchTasks();
    } catch (err) {
      console.error("Run task error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      console.error("Delete task error:", err);
    }
  };

  const handleCreateTask = async (data: {
    name: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    travelClass: string;
    cronExpr: string;
    priceTarget?: number;
  }) => {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to create task");
    }

    await fetchTasks();
  };

  const handleEditTask = async (data: {
    name: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    travelClass: string;
    cronExpr: string;
    priceTarget?: number;
  }) => {
    if (!editingTask) return;

    const response = await fetch(`/api/tasks/${editingTask.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to update task");
    }

    await fetchTasks();
    setEditingTask(null);
  };

  const openEditForm = (task: TaskData) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTask(null);
    setPrefillTask(null);
  };

  const openDetailDialog = (task: TaskData) => {
    setSelectedTaskId(task.id);
    setIsDetailOpen(true);
  };

  const closeDetailDialog = () => {
    setIsDetailOpen(false);
    setSelectedTaskId(null);
  };

  // Stats
  const activeTasks = tasks.filter((t) => t.active).length;
  const totalPriceChecks = tasks.reduce(
    (acc, t) => acc + (t._count?.priceHistory || 0),
    0
  );
  const tasksWithAlerts = tasks.filter((t) => t.priceTarget).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Scheduled Tasks</h1>
          <p className="text-muted-foreground">
            Manage your recurring flight searches and price tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{activeTasks}</p>
                  <p className="text-xs text-muted-foreground">Active Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <RefreshCw className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalPriceChecks}</p>
                  <p className="text-xs text-muted-foreground">Price Checks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{tasksWithAlerts}</p>
                  <p className="text-xs text-muted-foreground">Price Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          <TaskCardSkeleton />
          <TaskCardSkeleton />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && tasks.length === 0 && (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No Scheduled Tasks</CardTitle>
            <CardDescription>
              Create a scheduled task to automatically track flight prices over time.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Task
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      {!isLoading && tasks.length > 0 && (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleActive={handleToggleActive}
              onRun={handleRun}
              onDelete={handleDelete}
              onEdit={openEditForm}
              onViewDetails={openDetailDialog}
            />
          ))}
        </div>
      )}

      {/* Task Form Dialog */}
      <TaskForm
        open={isFormOpen}
        onOpenChange={closeForm}
        onSubmit={editingTask ? handleEditTask : handleCreateTask}
        editTask={editingTask}
        prefillData={prefillTask}
      />

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        taskId={selectedTaskId}
        open={isDetailOpen}
        onOpenChange={closeDetailDialog}
        onRun={handleRun}
      />
    </div>
  );
}
