import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HistoryPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search History</h1>
        <p className="text-muted-foreground">
          View and revisit your past flight searches
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No Search History</CardTitle>
          <CardDescription>
            Your search history will appear here after you perform your first search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All your searches are saved automatically. You can revisit them, compare prices
            over time, and convert them into scheduled tasks for tracking.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
