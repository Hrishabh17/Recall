import type { Clip, Script, Task, ListItem } from "@/types";

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

export function clipsToListItems(clips: Clip[]): ListItem[] {
  return clips.map((clip) => ({
    id: clip.id,
    type: "clip" as const,
    title: clip.type === "image" 
      ? `Image (${clip.content})` 
      : truncate(clip.content.split("\n")[0], 60),
    subtitle: formatTimeAgo(clip.createdAt),
    content: clip.content,
    data: clip,
  }));
}

export function scriptsToListItems(scripts: Script[]): ListItem[] {
  return scripts.map((script) => ({
    id: script.id,
    type: "script" as const,
    title: script.title,
    subtitle: script.tags || script.type,
    content: script.content,
    data: script,
  }));
}

export function formatTimeUntil(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  
  if (diffMs < 0) return "overdue";
  
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "< 1m";
  if (diffMin < 60) return `in ${diffMin}m`;
  if (diffHour < 24) return `in ${diffHour}h`;
  return `in ${diffDay}d`;
}

export function tasksToListItems(tasks: Task[]): ListItem[] {
  const now = new Date();
  return tasks.map((task) => {
    const remindAt = new Date(task.remindAt);
    const isOverdue = remindAt < now;
    
    return {
      id: task.id,
      type: "task" as const,
      title: task.title,
      subtitle: formatTimeUntil(task.remindAt),
      content: task.content,
      data: task,
      isOverdue,
    };
  });
}

export function calculateRemindDate(value: string): string {
  const now = new Date();
  const match = value.match(/^(\d+)([hmd])$/);
  if (!match) return now.toISOString();
  
  const amount = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case "m":
      now.setMinutes(now.getMinutes() + amount);
      break;
    case "h":
      now.setHours(now.getHours() + amount);
      break;
    case "d":
      now.setDate(now.getDate() + amount);
      break;
  }
  
  return now.toISOString();
}

export function calculateNextReminder(currentRemindAt: string, interval: string): string {
  const baseDate = new Date(currentRemindAt);
  const match = interval.match(/^(\d+)([hmd])$/);
  if (!match) return baseDate.toISOString();
  
  const amount = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case "m":
      baseDate.setMinutes(baseDate.getMinutes() + amount);
      break;
    case "h":
      baseDate.setHours(baseDate.getHours() + amount);
      break;
    case "d":
      baseDate.setDate(baseDate.getDate() + amount);
      break;
  }
  
  return baseDate.toISOString();
}

export function parseShortcut(shortcut: string): string {
  return shortcut
    .replace("CommandOrControl", "⌘")
    .replace("Control", "⌃")
    .replace("Alt", "⌥")
    .replace("Shift", "⇧")
    .replace(/\+/g, "");
}

export function getExpiryOptions() {
  return [
    { value: null, label: "Never (permanent)" },
    { value: "1h", label: "1 hour" },
    { value: "1d", label: "1 day" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
  ];
}

export function calculateExpiryDate(value: string | null): string | null {
  if (!value) return null;
  
  const now = new Date();
  const match = value.match(/^(\d+)([hdm])$/);
  if (!match) return null;
  
  const amount = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case "h":
      now.setHours(now.getHours() + amount);
      break;
    case "d":
      now.setDate(now.getDate() + amount);
      break;
    case "m":
      now.setMonth(now.getMonth() + amount);
      break;
  }
  
  return now.toISOString();
}
