# ScriptVault

A Raycast-like clipboard manager and script vault for developers.

## Features

- **Clipboard History** - Automatically saves up to 100 clipboard items (configurable)
- **Saved Scripts** - Pin important snippets permanently or with expiry dates
- **Instant Search** - Fuzzy search across all items
- **Global Shortcut** - Access from anywhere with `Cmd+Shift+V` (configurable)
- **Minimal UI** - Clean, Raycast-inspired interface

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+V` | Toggle window (configurable) |
| `↑` / `↓` | Navigate items |
| `Enter` | Copy to clipboard |
| `Cmd+P` | Pin clip to saved |
| `Cmd+⌫` | Delete item |
| `Esc` | Close window |

## Installation

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Export as Mac install dmg
npm run package
```

## How It Works

1. **Clipboard Monitoring** - The app watches your clipboard and saves every copy (up to 100 items)
2. **Temporary vs Permanent** - Clipboard history is temporary (FIFO), but you can pin items to save them permanently
3. **Expiry Control** - When saving scripts, choose: permanent, 1 hour, 1 day, 7 days, or 30 days
4. **Quick Access** - Press the global shortcut, search, and hit Enter to copy

## Data Storage

Data is stored locally in:
- **macOS**: `~/Library/Application Support/scriptvault/`
- **Windows**: `%APPDATA%/scriptvault/`
- **Linux**: `~/.config/scriptvault/`

## Tech Stack

- Electron
- React + TypeScript
- Tailwind CSS
- better-sqlite3
- Fuse.js (fuzzy search)
