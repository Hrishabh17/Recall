import BetterSqlite3 from "better-sqlite3";
import { app } from "electron";
import * as path from "path";
import { v4 as uuid } from "uuid";

export interface Clip {
  id: string;
  content: string;
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
  recurringInterval: string | null; // e.g., "5m", "1h", "1d", null for no recurring
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
  }

  // Clips
  addClip(content: string, maxClips: number = 100): Clip {
    const id = uuid();
    const now = new Date().toISOString();

    // Check for duplicate (don't add if same as most recent)
    const recent = this.db.prepare(
      "SELECT content FROM clips ORDER BY created_at DESC LIMIT 1"
    ).get() as { content: string } | undefined;

    if (recent?.content === content) {
      return { id: "", content, createdAt: now };
    }

    // Insert new clip
    this.db.prepare(
      "INSERT INTO clips (id, content, created_at) VALUES (?, ?, ?)"
    ).run(id, content, now);

    // Enforce max limit
    const count = this.db.prepare("SELECT COUNT(*) as count FROM clips").get() as { count: number };
    if (count.count > maxClips) {
      this.db.prepare(`
        DELETE FROM clips WHERE id IN (
          SELECT id FROM clips ORDER BY created_at ASC LIMIT ?
        )
      `).run(count.count - maxClips);
    }

    return { id, content, createdAt: now };
  }

  getClips(): Clip[] {
    const rows = this.db.prepare(
      "SELECT id, content, created_at as createdAt FROM clips ORDER BY created_at DESC"
    ).all();
    return rows as Clip[];
  }

  getClipById(id: string): Clip | undefined {
    return this.db.prepare(
      "SELECT id, content, created_at as createdAt FROM clips WHERE id = ?"
    ).get(id) as Clip | undefined;
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

  cleanExpiredScripts(): void {
    const now = new Date().toISOString();
    this.db.prepare(
      "DELETE FROM scripts WHERE expires_at IS NOT NULL AND expires_at < ?"
    ).run(now);
  }

  // Tasks
  addTask(content: string, title: string, remindAt: string, recurringInterval: string | null = null): Task {
    const id = uuid();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO tasks (id, content, title, remind_at, completed, notified, recurring_interval, created_at)
      VALUES (?, ?, ?, ?, 0, 0, ?, ?)
    `).run(id, content, title, remindAt, recurringInterval, now);
    
    return { id, content, title, remindAt, completed: false, notified: false, recurringInterval, createdAt: now };
  }

  getTasks(): Task[] {
    const rows = this.db.prepare(`
      SELECT id, content, title, remind_at as remindAt, completed, notified, recurring_interval as recurringInterval, created_at as createdAt
      FROM tasks WHERE completed = 0 ORDER BY remind_at ASC
    `).all();
    return (rows as any[]).map(r => ({
      ...r,
      completed: !!r.completed,
      notified: !!r.notified,
      recurringInterval: r.recurringInterval || null,
    }));
  }

  getDueTasks(): Task[] {
    const now = new Date().toISOString();
    const rows = this.db.prepare(`
      SELECT id, content, title, remind_at as remindAt, completed, notified, recurring_interval as recurringInterval, created_at as createdAt
      FROM tasks WHERE completed = 0 AND notified = 0 AND remind_at <= ?
      ORDER BY remind_at ASC
    `).all(now);
    return (rows as any[]).map(r => ({
      ...r,
      completed: !!r.completed,
      notified: !!r.notified,
      recurringInterval: r.recurringInterval || null,
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

  updateTask(id: string, title: string, remindAt: string, recurringInterval: string | null = null): void {
    // Reset notified flag when updating remind time
    this.db.prepare("UPDATE tasks SET title = ?, remind_at = ?, recurring_interval = ?, notified = 0 WHERE id = ?").run(title, remindAt, recurringInterval, id);
  }

  deleteTask(id: string): void {
    this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  }

  close(): void {
    this.db.close();
  }
}
