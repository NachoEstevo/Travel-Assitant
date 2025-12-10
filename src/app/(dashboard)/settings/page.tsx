"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Bell,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface NotificationStatus {
  email: {
    configured: boolean;
    recipient: string | null;
  };
  telegram: {
    configured: boolean;
    chatId: string | null;
  };
}

export default function SettingsPage() {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testResults, setTestResults] = useState<{
    email?: { success: boolean; error?: string };
    telegram?: { success: boolean; error?: string };
  }>({});

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/notifications/test");
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch notification status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const testNotification = async (channel: "email" | "telegram") => {
    if (channel === "email") {
      setTestingEmail(true);
    } else {
      setTestingTelegram(true);
    }

    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const result = data.data.find((r: { channel: string }) => r.channel === channel);
        if (result) {
          setTestResults((prev) => ({
            ...prev,
            [channel]: { success: result.success, error: result.error },
          }));
        }
      }
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [channel]: { success: false, error: "Failed to send test" },
      }));
    } finally {
      if (channel === "email") {
        setTestingEmail(false);
      } else {
        setTestingTelegram(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Configure notifications and application preferences
        </p>
      </div>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Configure how you receive price alerts and updates.
            Environment variables are set in <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Email Notifications</h3>
                  {status?.email.configured ? (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Configured
                    </Badge>
                  )}
                </div>
                {status?.email.recipient && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Sending to: {status.email.recipient}
                  </p>
                )}
                {!status?.email.configured && (
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    <p>Required environment variables:</p>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded block">RESEND_API_KEY</code>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded block">NOTIFICATION_EMAIL</code>
                  </div>
                )}
                {testResults.email && (
                  <div className={`text-sm mt-2 ${testResults.email.success ? "text-green-600" : "text-red-600"}`}>
                    {testResults.email.success ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Test email sent successfully!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {testResults.email.error}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testNotification("email")}
              disabled={!status?.email.configured || testingEmail}
            >
              {testingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Test
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Telegram */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-sky-100 text-sky-600">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Telegram Notifications</h3>
                  {status?.telegram.configured ? (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Configured
                    </Badge>
                  )}
                </div>
                {status?.telegram.chatId && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Chat ID: {status.telegram.chatId}
                  </p>
                )}
                {!status?.telegram.configured && (
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    <p>Required environment variables:</p>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded block">TELEGRAM_BOT_TOKEN</code>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded block">TELEGRAM_CHAT_ID</code>
                  </div>
                )}
                {testResults.telegram && (
                  <div className={`text-sm mt-2 ${testResults.telegram.success ? "text-green-600" : "text-red-600"}`}>
                    {testResults.telegram.success ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Test message sent successfully!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {testResults.telegram.error}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testNotification("telegram")}
              disabled={!status?.telegram.configured || testingTelegram}
            >
              {testingTelegram ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Test
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Email (Resend)</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Sign up at <a href="https://resend.com" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">resend.com <ExternalLink className="h-3 w-3" /></a></li>
              <li>Create an API key and add to <code className="bg-muted px-1 py-0.5 rounded">RESEND_API_KEY</code></li>
              <li>Set <code className="bg-muted px-1 py-0.5 rounded">NOTIFICATION_EMAIL</code> to your email</li>
              <li>Optionally set <code className="bg-muted px-1 py-0.5 rounded">RESEND_FROM_EMAIL</code> for custom sender</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Telegram</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Message <a href="https://t.me/BotFather" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">@BotFather <ExternalLink className="h-3 w-3" /></a> on Telegram</li>
              <li>Create a new bot with <code className="bg-muted px-1 py-0.5 rounded">/newbot</code></li>
              <li>Copy the token to <code className="bg-muted px-1 py-0.5 rounded">TELEGRAM_BOT_TOKEN</code></li>
              <li>Message your bot, then get your chat ID from <a href="https://api.telegram.org/bot{TOKEN}/getUpdates" target="_blank" className="text-primary hover:underline">the API</a></li>
              <li>Set <code className="bg-muted px-1 py-0.5 rounded">TELEGRAM_CHAT_ID</code> to your chat ID</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Notification Behavior */}
      <Card>
        <CardHeader>
          <CardTitle>When You&apos;ll Be Notified</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <Badge variant="secondary" className="text-green-600">Target Hit</Badge>
              When price reaches or drops below your target
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="secondary" className="text-blue-600">New Low</Badge>
              When a new lowest price is recorded
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="secondary" className="text-purple-600">Price Drop</Badge>
              When price drops by more than 5%
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
