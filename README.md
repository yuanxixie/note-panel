# README

# Note Panel

A minimal Chrome side panel extension for taking notes while browsing any webpage. Select text, right-click, and add it to your notes — all without leaving the page.

## Features

- **Side Panel**: Notes live in a side panel that stays open as you browse
- **Right-Click to Add**: Select any text on a webpage, right-click, and add it to your notes
- **Format Preservation**: Keeps line breaks, bullet points, and basic formatting
- **Multi-Topic Support**: Create and manage multiple note topics
- **Smart Scrolling**: Automatically scrolls to where content is inserted
- **Markdown Preview**: Toggle between edit and preview modes
- **Import/Export**: Import existing markdown files, export notes as `.md`
- **Persistent Storage**: Notes are saved locally and persist across browser sessions
- **Clean Paste**: Strips styling when pasting, keeping only structure
- **Undo Support**: Full Cmd+Z / Ctrl+Z support

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `note-panel` folder

## Usage

### Opening the Panel
Click the Note Panel icon in your browser toolbar to open the side panel.

### Adding Content
1. Select any text on a webpage
2. Right-click and choose **"Add to Note Panel"**
3. Content is added at your cursor position, or at the end if no cursor is set

### Managing Topics
- **Create**: Click `+` to create a new topic
- **Switch**: Use the dropdown to switch between topics
- **Import**: Click `↑` to import a markdown file as a new topic
- **Delete**: Click `Delete` to remove the current topic
- **Clear**: Click `Clear` to clear the current topic's content

### Preview Mode
Click **Preview** to see your notes rendered as Markdown. Click **Edit** to return to editing.

### Exporting
Click **Export** to download your notes as a `.md` file.

## Keyboard Shortcuts

- `Cmd+Z` / `Ctrl+Z`: Undo
- `Cmd+Shift+Z` / `Ctrl+Shift+Z`: Redo

## File Structure
```
note-panel/
├── manifest.json      # Extension configuration
├── background.js      # Context menu and event handling
├── sidepanel.html     # Side panel UI
├── sidepanel.js       # Side panel logic
├── style.css          # Styling
├── marked.min.js      # Markdown parser
└── icons/
    ├── icon32.png
    ├── icon64.png
    └── icon128.png
```

## Privacy

All data is stored locally in your browser using Chrome's storage API. No data is sent to any server.

## Tech Stack

- Vanilla JavaScript
- Chrome Extension APIs (sidePanel, storage, contextMenus, scripting)
- [Marked.js](https://marked.js.org/) for Markdown parsing

## License

MIT