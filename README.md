# DEAN Planning Board

An infinite canvas planning board application with real-time collaboration capabilities.

## Tech Stack

- **Framework:** Next.js 16 + React 19
- **Database:** Supabase (PostgreSQL + Real-time)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Deployment:** Vercel

## Project Structure

```
dean-2/
├── app/
│   ├── layout.js                 # Next.js root layout
│   ├── page.js                   # Home page (client-side)
│   ├── globals.css               # Tailwind CSS imports
│   ├── ProjectPlanningBoard.jsx  # Main app component (2961 lines)
│   └── tools/                    # Canvas tool modules
│       ├── index.js              # Tool registry
│       ├── select.js             # Selection/Move tool
│       ├── draw.js               # Freehand drawing
│       ├── line.js               # Line drawing
│       ├── text.js               # Text insertion
│       ├── image.js              # Image insertion
│       ├── erase.js              # Erase tool
│       └── scale.js              # Scaling/transformation
├── package.json
├── postcss.config.js             # Tailwind CSS config
├── .env.local                    # Environment variables
└── .vercel/                      # Vercel deployment config
```

## Features

### Infinite Canvas
- Dynamic canvas size based on content bounds
- Zoom range: 0.1x to 2x
- Pan with spacebar + drag or middle mouse button
- Fit-to-view (F key) - Figma-style instant zoom

### Tools
| Tool | Hotkey | Description |
|------|--------|-------------|
| Select/Move | S | Selection and moving elements |
| Scale | K | Scale selected elements with center-based scaling |
| Text | T | Insert and edit text (supports bold/italic) |
| Image | I | Import images from file picker |
| Draw | D | Freehand drawing with mouse |
| Line | L | Draw straight lines |
| Erase | E | Erase elements with selection box |

### Element Management
- Grouping/ungrouping support (G key)
- Copy/paste with Ctrl+C/V
- Undo/redo stack (50 states max)
- Delete with ESC or Backspace
- Multi-select with shift-click

### Real-time Collaboration
- Share board ID for collaboration
- Automatic merge of local and remote changes
- Tombstone-based deletion tracking
- Automatic debounced saves (1 second)

### Storage (Multiple Fallbacks)
1. **Supabase (Primary)** - Cloud database with real-time sync
2. **IndexedDB (Secondary)** - Local browser database fallback
3. **File System API (Tertiary)** - Directory access for local saves
4. **Export/Import (Fallback)** - JSON file download/upload

## Keyboard Shortcuts

| Key | Function |
|-----|----------|
| S | Select/Move tool |
| T | Text tool |
| I | Image tool |
| D | Draw tool |
| L | Line tool |
| E | Erase tool |
| K | Scale tool |
| F | Zoom to fit |
| Shift+! | Zoom to fit (alternate) |
| Shift+) | Reset view |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Ctrl+C | Copy selection |
| Ctrl+V | Paste |
| ESC / Backspace | Delete selection |
| G | Group selected elements |
| P | Toggle help modal |
| Space + Drag | Pan canvas |

## Supabase Configuration

**Project URL:** `https://wdxeucdxzwerqkdicwgq.supabase.co`

### Database Schema

```sql
TABLE: boards
- id: VARCHAR (primary key) - "{username}-{boardName}" or collaboration ID
- user_id: VARCHAR - Username reference
- data: JSONB - Contains full board state
- updated_at: TIMESTAMP - Last modification time
```

### Board Data Structure (JSONB)

```javascript
{
  name: string,
  elements: [
    {
      id: number,
      type: 'text' | 'image' | 'draw' | 'line',
      x: number,
      y: number,
      width: number,
      height: number,
      content?: string,      // text elements
      fontSize?: number,
      src?: string,          // base64 for images
      path?: [{x, y}][],     // for draw/line
      color?: string
    }
  ],
  groups: [
    {
      id: number,
      x: number,
      y: number,
      width: number,
      height: number,
      elements: [...]
    }
  ],
  zoom: number,
  deletedIds: number[],
  savedAt: ISO timestamp
}
```

## Authentication

Currently uses hardcoded users for development:
- Username: `kitten` / Password: `dean`
- Username: `slime` / Password: `dean`

> **Note:** Production deployment should implement proper authentication via Supabase Auth.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Dependencies

### Production
- `@supabase/supabase-js@^2.87.1`
- `next@^16.0.8`
- `react@^19.2.1`
- `react-dom@^19.2.1`
- `lucide-react@^0.559.0`

### Development
- `tailwindcss@^4.1.17`
- `@tailwindcss/postcss@^4.1.17`
- `autoprefixer@^10.4.22`
- `postcss@^8.5.6`

## Architecture Notes

- **Monolithic Component:** `ProjectPlanningBoard.jsx` handles all logic
- **Tool Plugin System:** Extensible via `tools/` directory
- **Hybrid Storage:** Cloud-first with local fallbacks
- **Real-time Sync:** Conflict-free merge strategy with tombstones
- **Canvas Rendering:** SVG and DOM-based (not Canvas API)
