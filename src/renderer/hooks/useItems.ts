import { useState, useEffect, useCallback, useMemo } from "react";
import type { Clip, Script, Task, ListItem } from "@/types";
import { clipsToListItems, scriptsToListItems, tasksToListItems } from "@/lib/utils";
import { createSearchIndex, searchItems } from "@/lib/search";
import type Fuse from "fuse.js";

type Filter = "all" | "clips" | "scripts" | "tasks";

export function useItems() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [searchIndex, setSearchIndex] = useState<Fuse<ListItem> | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsData, tasksData] = await Promise.all([
        window.api.getItems(),
        window.api.getTasks(),
      ]);
      setClips(itemsData.clips);
      setScripts(itemsData.scripts);
      setTasks(tasksData);
    } catch (err) {
      console.error("Failed to load items:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();

    const unsubClip = window.api.onClipAdded(() => {
      loadItems();
    });

    const unsubWindow = window.api.onWindowShown(() => {
      loadItems();
      setSearchQuery("");
    });

    return () => {
      unsubClip();
      unsubWindow();
    };
  }, [loadItems]);

  // Build list items based on filter
  const allItems = useMemo(() => {
    let items: ListItem[] = [];
    
    if (filter === "all" || filter === "clips") {
      items = [...items, ...clipsToListItems(clips)];
    }
    if (filter === "all" || filter === "scripts") {
      items = [...items, ...scriptsToListItems(scripts)];
    }
    if (filter === "tasks") {
      items = tasksToListItems(tasks);
    }
    
    return items;
  }, [clips, scripts, tasks, filter]);

  // Update search index when items change
  useEffect(() => {
    setSearchIndex(createSearchIndex(allItems));
  }, [allItems]);

  const filteredItems = useMemo(() => {
    if (!searchIndex) return allItems;
    return searchItems(searchIndex, searchQuery);
  }, [searchIndex, searchQuery, allItems]);

  const copyItem = useCallback(async (item: ListItem) => {
    console.log("[RENDERER] Copy called for item:", item.id, "content length:", item.content.length);
    try {
      await window.api.copyToClipboard(item.content);
      console.log("[RENDERER] Copy completed successfully");
    } catch (error) {
      console.error("[RENDERER] Copy failed:", error);
    }
  }, []);

  const deleteItem = useCallback(async (item: ListItem) => {
    if (item.type === "clip") {
      await window.api.deleteClip(item.id);
    } else if (item.type === "script") {
      await window.api.deleteScript(item.id);
    } else if (item.type === "task") {
      await window.api.deleteTask(item.id);
    }
    await loadItems();
  }, [loadItems]);

  const pinClip = useCallback(async (clipId: string, title?: string) => {
    await window.api.pinClip(clipId, title);
    await loadItems();
  }, [loadItems]);

  const saveScript = useCallback(async (script: Partial<Script>) => {
    await window.api.saveScript(script);
    await loadItems();
  }, [loadItems]);

  const addTask = useCallback(async (content: string, title: string, remindAt: string, recurringInterval?: string | null) => {
    await window.api.addTask(content, title, remindAt, recurringInterval);
    await loadItems();
  }, [loadItems]);

  const updateTask = useCallback(async (id: string, title: string, remindAt: string, recurringInterval?: string | null) => {
    await window.api.updateTask(id, title, remindAt, recurringInterval);
    await loadItems();
  }, [loadItems]);

  const completeTask = useCallback(async (id: string) => {
    await window.api.completeTask(id);
    await loadItems();
  }, [loadItems]);

  const clearClips = useCallback(async () => {
    await window.api.clearClips();
    await loadItems();
  }, [loadItems]);

  return {
    items: filteredItems,
    clips,
    scripts,
    tasks,
    loading,
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    copyItem,
    deleteItem,
    pinClip,
    saveScript,
    addTask,
    updateTask,
    completeTask,
    clearClips,
    refresh: loadItems,
  };
}
