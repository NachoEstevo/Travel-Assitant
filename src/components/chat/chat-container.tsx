"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage, ChatMessageProps } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FlightCard } from "@/components/flights/flight-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NormalizedFlight } from "@/lib/amadeus";
import { ParsedTravelQuery } from "@/lib/openai";
import { Plane, Sparkles, Trash2 } from "lucide-react";

interface Message extends ChatMessageProps {
  id: string;
  flightResults?: {
    flights: NormalizedFlight[];
    carriers?: Record<string, string>;
    searchId?: string;
    parsedQuery?: ParsedTravelQuery;
    insight?: string;
  };
}

interface ChatContainerProps {
  initialMessage?: string;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm your travel assistant. Tell me about the trip you're planning - where you want to go, when, your budget, or any preferences. I'll help you find the best flights.",
  timestamp: new Date(),
};

export function ChatContainer({ initialMessage }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch("/api/chat?limit=50");
        const data = await response.json();

        if (data.success && data.data.messages.length > 0) {
          const historyMessages: Message[] = data.data.messages.map(
            (m: { id: string; role: string; content: string; createdAt: string }) => ({
              id: m.id,
              role: m.role as "user" | "assistant" | "system",
              content: m.content,
              timestamp: new Date(m.createdAt),
            })
          );
          setMessages([WELCOME_MESSAGE, ...historyMessages]);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, []);

  // Handle initial message from URL or props
  useEffect(() => {
    if (initialMessage && !isLoadingHistory) {
      handleSendMessage(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingHistory]);

  // Persist message to database
  const persistMessage = async (role: string, content: string, searchId?: string) => {
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content, searchId }),
      });
    } catch (error) {
      console.error("Failed to persist message:", error);
    }
  };

  // Clear chat history
  const clearHistory = async () => {
    try {
      await fetch("/api/chat", { method: "DELETE" });
      setMessages([WELCOME_MESSAGE]);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Persist user message
    persistMessage("user", content);

    try {
      // Call natural language search API
      const response = await fetch("/api/flights/search-natural", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: content }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle clarification needed
        if (data.needsClarification && data.clarificationQuestions) {
          const clarificationContent = `I need a bit more information to search for your flight:\n\n${data.clarificationQuestions
              .map((q: string, i: number) => `${i + 1}. ${q}`)
              .join("\n")}`;
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: clarificationContent,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          persistMessage("assistant", clarificationContent);
          return;
        }

        throw new Error(data.error || "Search failed");
      }

      // Build response message
      const flightCount = data.data.flights.length;
      const parsedQuery = data.data.parsedQuery as ParsedTravelQuery | undefined;

      let responseContent = "";

      if (parsedQuery) {
        responseContent = `I found ${flightCount} flight${flightCount !== 1 ? "s" : ""} for your trip from ${parsedQuery.origin.city} to ${parsedQuery.destination.city}`;

        if (parsedQuery.dates.departure.date) {
          responseContent += ` departing ${formatDate(parsedQuery.dates.departure.date)}`;
        }

        if (parsedQuery.dates.return?.date) {
          responseContent += ` and returning ${formatDate(parsedQuery.dates.return.date)}`;
        }

        responseContent += ".";
      } else {
        responseContent = `I found ${flightCount} flight${flightCount !== 1 ? "s" : ""} for your search.`;
      }

      if (flightCount === 0) {
        responseContent = "I couldn't find any flights matching your criteria. Try adjusting your dates or destinations, or being more flexible with your requirements.";
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
        flightResults:
          flightCount > 0
            ? {
                flights: data.data.flights,
                carriers: data.data.dictionaries?.carriers,
                searchId: data.data.searchId,
                parsedQuery: data.data.parsedQuery,
                insight: data.data.insight,
              }
            : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      persistMessage("assistant", responseContent, data.data.searchId);
    } catch (error) {
      const errorContent = `Sorry, I encountered an error while searching for flights: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`;
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      persistMessage("assistant", errorContent);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h1 className="font-display text-xl font-semibold">Travel Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Describe your trip and I&apos;ll find the best flights
          </p>
        </div>
        {messages.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-2">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
            >
              {/* Flight Results */}
              {message.flightResults && (
                <div className="mt-4 space-y-4">
                  {/* AI Insight */}
                  {message.flightResults.insight && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        {message.flightResults.insight}
                      </p>
                    </div>
                  )}

                  {/* Parsed Query Summary */}
                  {message.flightResults.parsedQuery && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {message.flightResults.parsedQuery.origin.iataCode || message.flightResults.parsedQuery.origin.city} →{" "}
                        {message.flightResults.parsedQuery.destination.iataCode || message.flightResults.parsedQuery.destination.city}
                      </Badge>
                      {message.flightResults.parsedQuery.preferences.maxBudget && (
                        <Badge variant="outline" className="text-xs">
                          Budget: ${message.flightResults.parsedQuery.preferences.maxBudget}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {message.flightResults.parsedQuery.preferences.cabinClass
                          .toLowerCase()
                          .replace("_", " ")}
                      </Badge>
                    </div>
                  )}

                  {/* Flight Cards (show top 3) */}
                  <div className="space-y-3">
                    {message.flightResults.flights.slice(0, 3).map((flight) => (
                      <FlightCard
                        key={flight.id}
                        flight={flight}
                        carriers={message.flightResults?.carriers}
                      />
                    ))}

                    {/* Show more indicator */}
                    {message.flightResults.flights.length > 3 && (
                      <div className="text-center py-2">
                        <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                          <Plane className="h-3 w-3 mr-1" />
                          {message.flightResults.flights.length - 3} more flights available
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ChatMessage>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <ChatMessage role="assistant" content="Searching for flights..." isStreaming />
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
