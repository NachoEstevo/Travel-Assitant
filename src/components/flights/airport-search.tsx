"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  type: string;
}

interface AirportSearchProps {
  id: string;
  label: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  iconRotation?: string;
  error?: string;
}

export function AirportSearch({
  id,
  label,
  value,
  onChange,
  placeholder = "Search city or airport...",
  disabled = false,
  iconRotation = "-45deg",
  error,
}: AirportSearchProps) {
  const [query, setQuery] = useState("");
  const [displayValue, setDisplayValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Airport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch airports from API
  const searchAirports = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/airports?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data.success && data.data) {
        setSuggestions(data.data);
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Airport search error:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchAirports(query);
      }, 300);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchAirports]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectAirport(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Select an airport
  const selectAirport = (airport: Airport) => {
    onChange(airport.code);
    setDisplayValue(airport.code);
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
    setSuggestions([]);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // If it's exactly 3 uppercase letters, treat as direct IATA code
    if (/^[A-Z]{3}$/.test(inputValue.toUpperCase())) {
      setDisplayValue(inputValue.toUpperCase());
      onChange(inputValue.toUpperCase());
      setQuery("");
      setSuggestions([]);
      setIsOpen(false);
    } else {
      setQuery(inputValue);
      setDisplayValue(inputValue);
    }
  };

  // Handle input focus
  const handleFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  // When value changes externally, update display
  useEffect(() => {
    if (value && value !== displayValue) {
      setDisplayValue(value);
    }
  }, [value]);

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Plane
          className="absolute left-3 top-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          style={{ transform: `translateY(-50%) rotate(${iconRotation})` }}
        />
        <Input
          ref={inputRef}
          id={id}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "pl-10 uppercase",
            displayValue.length === 3 && /^[A-Z]{3}$/.test(displayValue)
              ? "font-mono text-lg tracking-wider"
              : ""
          )}
          disabled={disabled}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}

        {/* Suggestions dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            {suggestions.map((airport, index) => (
              <button
                key={`${airport.code}-${index}`}
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-start gap-3",
                  selectedIndex === index && "bg-accent"
                )}
                onClick={() => selectAirport(airport)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {airport.type === "airport" ? (
                    <Plane className="w-4 h-4 text-primary" />
                  ) : (
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-primary">
                      {airport.code}
                    </span>
                    <span className="text-sm text-foreground truncate">
                      {airport.name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {airport.city}, {airport.country}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {isOpen && query.length >= 2 && !isLoading && suggestions.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground">
            No airports found for &quot;{query}&quot;
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
