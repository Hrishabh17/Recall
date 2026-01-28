import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

interface SettingsSchema {
  shortcut: string;
  maxClips: number;
  fontSize: "small" | "medium" | "large";
}

const defaults: SettingsSchema = {
  shortcut: "CommandOrControl+Shift+V",
  maxClips: 100,
  fontSize: "small",
};

export class Settings {
  private filePath: string;
  private data: SettingsSchema;

  constructor() {
    this.filePath = path.join(app.getPath("userData"), "settings.json");
    this.data = this.load();
  }

  private load(): SettingsSchema {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, "utf-8");
        return { ...defaults, ...JSON.parse(content) };
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
    return { ...defaults };
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  }

  get<K extends keyof SettingsSchema>(key: K, defaultValue?: SettingsSchema[K]): SettingsSchema[K] {
    return this.data[key] ?? defaultValue ?? defaults[key];
  }

  set<K extends keyof SettingsSchema>(key: K, value: SettingsSchema[K]): void {
    this.data[key] = value;
    this.save();
  }

  getAll(): SettingsSchema {
    return { ...this.data };
  }
}
