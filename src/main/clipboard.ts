import { clipboard } from "electron";

export class ClipboardWatcher {
  private lastContent: string = "";
  private interval: NodeJS.Timeout | null = null;
  private paused: boolean = false;
  private resumeTimeout: NodeJS.Timeout | null = null;
  private ignoreNextChange: boolean = false;
  private onClip: (content: string) => void;

  constructor(onClip: (content: string) => void) {
    this.onClip = onClip;
    this.lastContent = clipboard.readText();
  }

  start(intervalMs: number = 500) {
    if (this.interval) return;

    this.interval = setInterval(() => {
      if (this.paused) return;

      const content = clipboard.readText();
      
      // If we're ignoring the next change, skip it once
      if (this.ignoreNextChange) {
        this.ignoreNextChange = false;
        this.lastContent = content;
        return;
      }
      
      // Only trigger if content changed and is not empty
      if (content && content !== this.lastContent) {
        this.lastContent = content;
        this.onClip(content);
      }
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.resumeTimeout) {
      clearTimeout(this.resumeTimeout);
      this.resumeTimeout = null;
    }
  }

  pause() {
    this.paused = true;
    // Clear any pending resume
    if (this.resumeTimeout) {
      clearTimeout(this.resumeTimeout);
      this.resumeTimeout = null;
    }
  }

  resume() {
    // Clear any pending resume to prevent multiple resumes
    if (this.resumeTimeout) {
      clearTimeout(this.resumeTimeout);
    }
    
    // Delay resume to ensure clipboard operations complete
    this.resumeTimeout = setTimeout(() => {
      this.paused = false;
      this.lastContent = clipboard.readText();
      this.resumeTimeout = null;
    }, 100);
  }

  // Public method to update the last content tracker
  updateLastContent(content: string) {
    this.lastContent = content;
  }
  
  // Set flag to ignore the next clipboard change
  ignoreNext() {
    this.ignoreNextChange = true;
  }
  
  // Reset lastContent to force next clipboard read to be treated as new
  resetTracking() {
    this.lastContent = "";
  }
}
