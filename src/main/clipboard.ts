import { clipboard, nativeImage } from "electron";

export interface ClipboardContent {
  type: "text" | "image";
  content: string; // Text content or placeholder for images
  imageData?: string; // Base64 encoded image data (for images)
}

export class ClipboardWatcher {
  private lastContent: string = "";
  private lastImageHash: string = "";
  private interval: NodeJS.Timeout | null = null;
  private paused: boolean = false;
  private resumeTimeout: NodeJS.Timeout | null = null;
  private ignoreNextChange: boolean = false;
  private onClip: (clipContent: ClipboardContent) => void;

  constructor(onClip: (clipContent: ClipboardContent) => void) {
    this.onClip = onClip;
    this.lastContent = clipboard.readText();
    // Initialize last image hash
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      this.lastImageHash = this.getImageHash(image);
    }
  }
  
  /**
   * Generate a simple hash for image comparison
   * Uses image size and a sample of pixels to detect changes
   */
  private getImageHash(image: Electron.NativeImage): string {
    const size = image.getSize();
    // Create a simple hash from size and a sample
    return `${size.width}x${size.height}-${image.toDataURL().substring(0, 100)}`;
  }

  start(intervalMs: number = 500) {
    if (this.interval) return;

    this.interval = setInterval(() => {
      if (this.paused) return;

      // Check for images first (images can also have text representation)
      const image = clipboard.readImage();
      const hasImage = !image.isEmpty();
      
      // If we're ignoring the next change, skip it once
      if (this.ignoreNextChange) {
        this.ignoreNextChange = false;
        if (hasImage) {
          this.lastImageHash = this.getImageHash(image);
        }
        this.lastContent = clipboard.readText();
        return;
      }
      
      if (hasImage) {
        // Check if image changed
        const imageHash = this.getImageHash(image);
        if (imageHash !== this.lastImageHash) {
          this.lastImageHash = imageHash;
          // Convert image to base64 data URL
          const imageData = image.toDataURL();
          this.onClip({
            type: "image",
            content: `Image (${image.getSize().width}x${image.getSize().height})`,
            imageData,
          });
          // Also update lastContent to prevent text trigger
          this.lastContent = clipboard.readText();
          return;
        }
      }
      
      // Check for text changes
      const content = clipboard.readText();
      if (content && content !== this.lastContent) {
        this.lastContent = content;
        this.onClip({
          type: "text",
          content,
        });
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
      const image = clipboard.readImage();
      if (!image.isEmpty()) {
        this.lastImageHash = this.getImageHash(image);
      } else {
        this.lastImageHash = "";
      }
      this.resumeTimeout = null;
    }, 100);
  }

  // Public method to update the last content tracker
  updateLastContent(content: string) {
    this.lastContent = content;
  }
  
  // Update last image hash
  updateLastImage(imageData?: string) {
    if (imageData) {
      const image = nativeImage.createFromDataURL(imageData);
      if (!image.isEmpty()) {
        this.lastImageHash = this.getImageHash(image);
      }
    } else {
      this.lastImageHash = "";
    }
  }
  
  // Set flag to ignore the next clipboard change
  ignoreNext() {
    this.ignoreNextChange = true;
  }
  
  // Reset lastContent to force next clipboard read to be treated as new
  resetTracking() {
    this.lastContent = "";
    this.lastImageHash = "";
  }
}
