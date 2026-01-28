export interface Clip {
  id: string;
  content: string;
  type: "text" | "image";
  imageData?: string; // Base64 encoded image data (for image clips)
  createdAt: string;
}

export interface Script {
  id: string;
  title: string;
  content: string;
  type: "sql" | "bash" | "curl" | "text";
  tags: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  content: string;
  title: string;
  remindAt: string;
  completed: boolean;
  notified: boolean;
  recurringInterval: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  snoozedUntil: string | null;
  createdAt: string;
}

export type ItemType = "clip" | "script" | "task";

export interface ListItem {
  id: string;
  type: ItemType;
  title: string;
  subtitle: string;
  content: string;
  data: Clip | Script | Task;
  isOverdue?: boolean;
}

export interface Settings {
  shortcut: string;
  maxClips: number;
  fontSize: "small" | "medium" | "large";
}

export type View = "list" | "script-form" | "settings" | "remind-form";
