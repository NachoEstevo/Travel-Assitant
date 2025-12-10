// Saved Searches Storage using localStorage

const STORAGE_KEY = "savedSearches";
const MAX_SAVED_SEARCHES = 10;

export interface SavedSearch {
  id: string;
  name: string;
  query: string; // Natural language query
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  createdAt: string;
}

export function getSavedSearches(): SavedSearch[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load saved searches:", e);
    return [];
  }
}

export function saveSearch(search: Omit<SavedSearch, "id" | "createdAt">): SavedSearch {
  const searches = getSavedSearches();

  // Check if same query already exists
  const existingIndex = searches.findIndex(
    (s) => s.query.toLowerCase() === search.query.toLowerCase()
  );

  if (existingIndex !== -1) {
    // Update existing search
    searches[existingIndex] = {
      ...searches[existingIndex],
      ...search,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
    return searches[existingIndex];
  }

  // Create new search
  const newSearch: SavedSearch = {
    ...search,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  // Add to beginning, limit to max
  const updated = [newSearch, ...searches].slice(0, MAX_SAVED_SEARCHES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  return newSearch;
}

export function deleteSavedSearch(id: string): void {
  const searches = getSavedSearches();
  const updated = searches.filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearAllSavedSearches(): void {
  localStorage.removeItem(STORAGE_KEY);
}
