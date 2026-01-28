import { useState, useEffect, useCallback } from "react";
import type { Settings } from "@/types";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({
    shortcut: "CommandOrControl+Shift+V",
    maxClips: 100,
    fontSize: "small",
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const data = await window.api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    await window.api.updateSettings(newSettings);
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  return { settings, loading, updateSettings };
}
