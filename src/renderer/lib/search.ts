import Fuse from "fuse.js";
import type { ListItem } from "@/types";

const fuseOptions: Fuse.IFuseOptions<ListItem> = {
  keys: [
    { name: "title", weight: 0.4 },
    { name: "content", weight: 0.3 },
    { name: "subtitle", weight: 0.2 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true,
};

export function createSearchIndex(items: ListItem[]): Fuse<ListItem> {
  return new Fuse(items, fuseOptions);
}

export function searchItems(fuse: Fuse<ListItem>, query: string): ListItem[] {
  if (!query.trim()) {
    return fuse.getIndex().docs as ListItem[];
  }
  return fuse.search(query).map((result) => result.item);
}
