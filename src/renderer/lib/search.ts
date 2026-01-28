import Fuse from "fuse.js";
import type { ListItem, Script } from "@/types";
import type { SearchFilters } from "@/components/SearchFilters";
import { detectContentType } from "./contentDetection";

/**
 * Fuse.js search configuration
 * 
 * Weights:
 * - title: 0.4 (most important - user-defined names)
 * - content: 0.3 (actual content)
 * - subtitle: 0.2 (metadata like tags, timestamps)
 */
const fuseOptions: Fuse.IFuseOptions<ListItem> = {
  keys: [
    { name: "title", weight: 0.4 },
    { name: "content", weight: 0.3 },
    { name: "subtitle", weight: 0.2 },
  ],
  threshold: 0.4, // Lower = stricter matching
  ignoreLocation: true, // Match anywhere in text
  includeScore: true, // Include match scores
};

/**
 * Creates a Fuse.js search index from items
 */
export function createSearchIndex(items: ListItem[]): Fuse<ListItem> {
  return new Fuse(items, fuseOptions);
}

/**
 * Applies advanced filters to items
 * 
 * Filters:
 * - scriptType: Match content type for ALL items (clips, scripts, tasks)
 *   Maps filter values to detected content types:
 *   - "sql" -> SQL content
 *   - "bash" -> Bash/Shell content  
 *   - "curl" -> URL content (for curl commands)
 *   - "text" -> Text content
 */
function applyFilters(items: ListItem[], filters: SearchFilters): ListItem[] {
  let filtered = items;

  // Script type filter - applies to ALL items based on detected content type
  if (filters && filters.scriptType) {
    filtered = filtered.filter((item) => {
      // Detect content type from the item's content
      const detected = detectContentType(item.content);
      
      // Map filter scriptType to content types
      switch (filters.scriptType) {
        case "sql":
          return detected.type === "sql";
        case "bash":
          return detected.type === "bash";
        case "curl":
          // cURL commands are usually URLs or bash commands
          return detected.type === "url" || detected.type === "bash";
        case "text":
          return detected.type === "text";
        default:
          return true;
      }
    });
  }

  return filtered;
}

/**
 * Searches items with optional filters
 * 
 * @param fuse - Fuse.js search index
 * @param query - Search query string
 * @param filters - Advanced filters (optional)
 * @returns Filtered and searched items
 */
export function searchItems(
  fuse: Fuse<ListItem>,
  query: string,
  filters?: SearchFilters
): ListItem[] {
  // Get all items or search results
  let results: ListItem[];
  if (!query.trim()) {
    results = fuse.getIndex().docs as ListItem[];
  } else {
    results = fuse.search(query).map((result) => result.item);
  }

  // Apply advanced filters if provided and has active filters
  if (filters && (filters.scriptType || filters.contentType || filters.tag || filters.dateRange)) {
    results = applyFilters(results, filters);
  }

  return results;
}
