import BetterSqlite3 from "better-sqlite3";
import { app } from "electron";
import * as path from "path";
import { v4 as uuid } from "uuid";

export interface Clip {
  id: string;
  content: string;
  type: "text" | "image"; // Type of clip: text or image
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
  recurringInterval: string | null; // e.g., "5m", "1h", "1d", "weekly:mon", "monthly:15", null for no recurring
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  snoozedUntil: string | null;
  createdAt: string;
}

export class Database {
  private db: BetterSqlite3.Database;

  constructor() {
    // Store database in recall directory (not scriptvault)
    // app.getPath("userData") returns ~/Library/Application Support/recall/ on macOS
    const dbPath = path.join(app.getPath("userData"), "recall.db");
    this.db = new BetterSqlite3(dbPath);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clips (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'text',
        image_data TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scripts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'text',
        tags TEXT DEFAULT '',
        expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        title TEXT NOT NULL,
        remind_at TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        notified INTEGER NOT NULL DEFAULT 0,
        recurring_interval TEXT,
        priority TEXT DEFAULT 'medium',
        category TEXT DEFAULT '',
        snoozed_until TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_clips_created ON clips(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_scripts_updated ON scripts(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tasks_remind ON tasks(remind_at ASC);
    `);
    
    // Migration: Add recurring_interval column if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN recurring_interval TEXT`);
    } catch (e) {
      // Column already exists, ignore error
    }
    
    // Migration: Add priority column if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium'`);
    } catch (e) {
      // Column already exists, ignore error
    }
    
    // Migration: Add category column if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT ''`);
    } catch (e) {
      // Column already exists, ignore error
    }
    
    // Migration: Add snoozed_until column if it doesn't exist
    try {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN snoozed_until TEXT`);
    } catch (e) {
      // Column already exists, ignore error
    }
    
    // Migration: Add type and image_data columns to clips if they don't exist
    try {
      this.db.exec(`ALTER TABLE clips ADD COLUMN type TEXT DEFAULT 'text'`);
    } catch (e) {
      // Column already exists, ignore error
    }
    try {
      this.db.exec(`ALTER TABLE clips ADD COLUMN image_data TEXT`);
    } catch (e) {
      // Column already exists, ignore error
    }
  }

  // Clips
  addClip(content: string, maxClips: number = 100, type: "text" | "image" = "text", imageData?: string): Clip {
    const id = uuid();
    const now = new Date().toISOString();

    // Check for duplicate (don't add if same as most recent)
    // For images, compare image data; for text, compare content
    const recent = this.db.prepare(
      "SELECT content, type, image_data FROM clips ORDER BY created_at DESC LIMIT 1"
    ).get() as { content: string; type: string; image_data?: string } | undefined;

    if (type === "image" && recent?.type === "image" && recent?.image_data === imageData) {
      return { id: "", content, type: "image", imageData, createdAt: now };
    } else if (type === "text" && recent?.content === content && recent?.type === "text") {
      return { id: "", content, type: "text", createdAt: now };
    }

    // Insert new clip
    this.db.prepare(
      "INSERT INTO clips (id, content, type, image_data, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, content, type, imageData || null, now);

    // Enforce max limit
    const count = this.db.prepare("SELECT COUNT(*) as count FROM clips").get() as { count: number };
    if (count.count > maxClips) {
      this.db.prepare(`
        DELETE FROM clips WHERE id IN (
          SELECT id FROM clips ORDER BY created_at ASC LIMIT ?
        )
      `).run(count.count - maxClips);
    }

    return { id, content, type, imageData, createdAt: now };
  }

  getClips(): Clip[] {
    const rows = this.db.prepare(
      "SELECT id, content, type, image_data as imageData, created_at as createdAt FROM clips ORDER BY created_at DESC"
    ).all();
    return (rows as any[]).map(r => ({
      id: r.id,
      content: r.content,
      type: (r.type || "text") as "text" | "image",
      imageData: r.imageData || undefined,
      createdAt: r.createdAt,
    }));
  }

  getClipById(id: string): Clip | undefined {
    const row = this.db.prepare(
      "SELECT id, content, type, image_data as imageData, created_at as createdAt FROM clips WHERE id = ?"
    ).get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      content: row.content,
      type: (row.type || "text") as "text" | "image",
      imageData: row.imageData || undefined,
      createdAt: row.createdAt,
    };
  }

  deleteClip(id: string): void {
    this.db.prepare("DELETE FROM clips WHERE id = ?").run(id);
  }

  clearClips(): void {
    this.db.prepare("DELETE FROM clips").run();
  }

  // Scripts
  saveScript(script: Omit<Script, "id" | "createdAt" | "updatedAt"> & { id?: string }): Script {
    const now = new Date().toISOString();
    
    if (script.id) {
      // Update existing
      this.db.prepare(`
        UPDATE scripts SET title = ?, content = ?, type = ?, tags = ?, expires_at = ?, updated_at = ?
        WHERE id = ?
      `).run(script.title, script.content, script.type, script.tags, script.expiresAt, now, script.id);
      
      return { ...script, id: script.id, createdAt: now, updatedAt: now } as Script;
    } else {
      // Insert new
      const id = uuid();
      this.db.prepare(`
        INSERT INTO scripts (id, title, content, type, tags, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, script.title, script.content, script.type, script.tags, script.expiresAt, now, now);
      
      return { ...script, id, createdAt: now, updatedAt: now } as Script;
    }
  }

  getScripts(): Script[] {
    const rows = this.db.prepare(`
      SELECT id, title, content, type, tags, expires_at as expiresAt, 
             created_at as createdAt, updated_at as updatedAt 
      FROM scripts ORDER BY updated_at DESC
    `).all();
    return rows as Script[];
  }

  getScriptById(id: string): Script | undefined {
    return this.db.prepare(`
      SELECT id, title, content, type, tags, expires_at as expiresAt,
             created_at as createdAt, updated_at as updatedAt
      FROM scripts WHERE id = ?
    `).get(id) as Script | undefined;
  }

  deleteScript(id: string): void {
    this.db.prepare("DELETE FROM scripts WHERE id = ?").run(id);
  }

  /**
   * Remove a tag from all scripts that contain it
   * This permanently deletes the tag from the system
   */
  removeTagFromAllScripts(tagToRemove: string): number {
    const scripts = this.getScripts();
    let updatedCount = 0;
    
    for (const script of scripts) {
      if (script.tags && script.tags.trim().length > 0) {
        // Parse tags, remove the target tag, and reconstruct
        const originalTags = script.tags.split(",").map(t => t.trim()).filter(t => t.length > 0);
        const tagToRemoveLower = tagToRemove.trim().toLowerCase();
        
        // Check if the tag exists in the script
        const hasTag = originalTags.some(t => t.toLowerCase() === tagToRemoveLower);
        
        if (hasTag) {
          // Remove the tag (case-insensitive)
          const newTagsArray = originalTags.filter(t => t.toLowerCase() !== tagToRemoveLower);
          const newTags = newTagsArray.length > 0 ? newTagsArray.join(", ") : "";
          
          const now = new Date().toISOString();
          this.db.prepare(`
            UPDATE scripts SET tags = ?, updated_at = ?
            WHERE id = ?
          `).run(newTags, now, script.id);
          updatedCount++;
        }
      }
    }
    
    return updatedCount;
  }

  cleanExpiredScripts(): void {
    const now = new Date().toISOString();
    this.db.prepare(
      "DELETE FROM scripts WHERE expires_at IS NOT NULL AND expires_at < ?"
    ).run(now);
  }

  // Tasks
  addTask(
    content: string, 
    title: string, 
    remindAt: string, 
    recurringInterval: string | null = null,
    priority: "low" | "medium" | "high" | "urgent" = "medium",
    category: string = ""
  ): Task {
    const id = uuid();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO tasks (id, content, title, remind_at, completed, notified, recurring_interval, priority, category, created_at)
      VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
    `).run(id, content, title, remindAt, recurringInterval, priority, category, now);
    
    return { 
      id, 
      content, 
      title, 
      remindAt, 
      completed: false, 
      notified: false, 
      recurringInterval, 
      priority,
      category,
      snoozedUntil: null,
      createdAt: now 
    };
  }

  getTasks(): Task[] {
    const rows = this.db.prepare(`
      SELECT id, content, title, remind_at as remindAt, completed, notified, recurring_interval as recurringInterval, 
             priority, category, snoozed_until as snoozedUntil, created_at as createdAt
      FROM tasks WHERE completed = 0 ORDER BY remind_at ASC
    `).all();
    return (rows as any[]).map(r => ({
      ...r,
      completed: !!r.completed,
      notified: !!r.notified,
      recurringInterval: r.recurringInterval || null,
      priority: r.priority || "medium",
      category: r.category || "",
      snoozedUntil: r.snoozedUntil || null,
    }));
  }

  getDueTasks(): Task[] {
    const now = new Date().toISOString();
    const rows = this.db.prepare(`
      SELECT id, content, title, remind_at as remindAt, completed, notified, recurring_interval as recurringInterval,
             priority, category, snoozed_until as snoozedUntil, created_at as createdAt
      FROM tasks 
      WHERE completed = 0 
        AND notified = 0 
        AND remind_at <= ?
        AND (snoozed_until IS NULL OR snoozed_until <= ?)
      ORDER BY remind_at ASC
    `).all(now, now);
    return (rows as any[]).map(r => ({
      ...r,
      completed: !!r.completed,
      notified: !!r.notified,
      recurringInterval: r.recurringInterval || null,
      priority: r.priority || "medium",
      category: r.category || "",
      snoozedUntil: r.snoozedUntil || null,
    }));
  }

  getOverdueTaskCount(): number {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks WHERE completed = 0 AND remind_at <= ?
    `).get(now) as { count: number };
    return result.count;
  }

  markTaskNotified(id: string): void {
    this.db.prepare("UPDATE tasks SET notified = 1 WHERE id = ?").run(id);
  }

  updateTaskRemindAt(id: string, remindAt: string): void {
    // Reset notified flag when updating remind time
    this.db.prepare("UPDATE tasks SET remind_at = ?, notified = 0 WHERE id = ?").run(remindAt, id);
  }

  completeTask(id: string): void {
    this.db.prepare("UPDATE tasks SET completed = 1 WHERE id = ?").run(id);
  }

  updateTask(
    id: string, 
    title: string, 
    remindAt: string, 
    recurringInterval: string | null = null,
    priority: "low" | "medium" | "high" | "urgent" = "medium",
    category: string = ""
  ): void {
    // Reset notified flag when updating remind time
    this.db.prepare(`
      UPDATE tasks 
      SET title = ?, remind_at = ?, recurring_interval = ?, priority = ?, category = ?, notified = 0 
      WHERE id = ?
    `).run(title, remindAt, recurringInterval, priority, category, id);
  }
  
  snoozeTask(id: string, snoozedUntil: string): void {
    this.db.prepare("UPDATE tasks SET snoozed_until = ? WHERE id = ?").run(snoozedUntil, id);
  }
  
  clearSnooze(id: string): void {
    this.db.prepare("UPDATE tasks SET snoozed_until = NULL WHERE id = ?").run(id);
  }

  deleteTask(id: string): void {
    this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  }

  close(): void {
    this.db.close();
  }
}
