# RSS Blog Categorizer

A Visual Studio Code extension that fetches RSS feeds from developer blogs, automatically categorizes posts by technology topics, and provides export functionality in HTML and Markdown formats for blog publishing.

## Features

- 📡 **RSS Feed Parsing** - Fetches and parses RSS/Atom feeds with robust error handling
- 🏷️ **Smart Categorization** - Automatically categorizes posts by technology (JavaScript, Python, DevOps, etc.)
- 🌳 **Tree View Integration** - Displays categorized posts in VS Code sidebar with expandable categories
- 📄 **Export Functionality** - Generates HTML and Markdown files with professional templates
- ⚙️ **Configurable Settings** - Customizable RSS feed URLs, refresh intervals, and date filtering
- 🔄 **Auto-refresh** - Configurable automatic feed updates
- 📚 **Book Recommendations** - Includes "The Geek Shelf" section with rotating book recommendations

## Installation

### From VSIX Package

1. Download the `.vsix` file from the releases
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X`)
4. Click the three dots menu and select "Install from VSIX..."
5. Select the downloaded `.vsix` file

### From Source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press `F5` to launch a new Extension Development Host window

## Usage

### Getting Started

1. After installation, the "Dev Blog Posts" view will appear in the Explorer panel
2. The extension comes pre-configured with a default RSS feed
3. Click the refresh button to load the latest posts
4. Posts are automatically categorized and displayed in a tree structure

### Setting Up Your RSS Feed

1. Click the edit icon (pencil) in the "Dev Blog Posts" view header
2. Enter your RSS feed URL when prompted
3. The feed will automatically refresh with new content

### Exporting Posts

1. Click "Export as Markdown" or "Export as HTML" from the view menu
2. Choose your save location
3. The exported file will include:
   - Auto-generated "Dew Drop" title with incremental numbering
   - Categorized posts with author attribution
   - "The Geek Shelf" section with book recommendations

### Configuration Options

Access settings via `File > Preferences > Settings` and search for "RSS Blog Categorizer":

- **Feed URL**: Single RSS feed URL to monitor
- **Record Count**: Number of records to retrieve (1-200)
- **Minimum DateTime**: Filter posts by publication date (UTC format)
- **Refresh Interval**: Auto-refresh interval in minutes

## Smart Date Filtering

The extension uses intelligent date filtering:

1. **Automatic Mode** (default): Uses the publication date of the latest "Dew Drop" post from alvinashcraft.com
2. **Fallback**: If unavailable, filters to posts from the last 24 hours (UTC)
3. **Manual Override**: Set a custom UTC datetime in settings

Example UTC formats:

- `2025-01-01T00:00:00Z` (midnight UTC)
- `2025-09-27T12:00:00.000Z` (with milliseconds)

## Customizing Categories

Edit the `categories.json` file to customize post categorization:

```json
{
  "categories": {
    "Web Development": [
      "javascript", "react", "vue", "angular", "typescript"
    ],
    "AI": [
      "ai", "machine learning", "openai", "copilot"
    ]
  },
  "defaultCategory": "General"
}
```

**How it works:**

- Categories are checked in JSON order (first match wins)
- Only post titles are searched (case-insensitive)
- Unmatched posts go to the default category

See [CATEGORIES.md](CATEGORIES.md) for detailed configuration instructions.

## Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `RSS Blog Categorizer: Refresh` | Refresh the RSS feed | - |
| `RSS Blog Categorizer: Export as Markdown` | Export posts to Markdown | - |
| `RSS Blog Categorizer: Export as HTML` | Export posts to HTML | - |
| `RSS Blog Categorizer: Set RSS Feed` | Configure RSS feed URL | - |

## File Structure

```text
src/
├── extension.ts        # Main extension entry point
├── rssProvider.ts     # RSS parsing and tree data provider
└── exportManager.ts   # HTML/Markdown export functionality
categories.json        # Category configuration
books.json            # Book recommendations for exports
package.json          # Extension manifest
```

## Development

### Prerequisites

- Node.js (16.x or later)
- Visual Studio Code
- TypeScript

### Setup

```bash
# Clone the repository
git clone https://github.com/alvinashcraft/DevFeedCategorizer.git
cd DevFeedCategorizer

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes during development
npm run watch
```

### Testing

1. Press `F5` to launch Extension Development Host
2. Test the extension functionality
3. Check the Debug Console for logs

### Building VSIX Package

```bash
# Install vsce globally if not already installed
npm install -g vsce

# Package the extension
vsce package
```

## Configuration Schema

```json
{
  "rssBlogCategorizer.feedUrl": {
    "type": "string",
    "default": "https://dev.to/feed",
    "description": "Single RSS feed URL to monitor"
  },
  "rssBlogCategorizer.recordCount": {
    "type": "number", 
    "default": 20,
    "minimum": 1,
    "maximum": 200,
    "description": "Number of records to retrieve from RSS feed"
  },
  "rssBlogCategorizer.minimumDateTime": {
    "type": "string",
    "default": "",
    "description": "Minimum datetime for blog posts in UTC (ISO format)"
  },
  "rssBlogCategorizer.refreshInterval": {
    "type": "number",
    "default": 30,
    "description": "Refresh interval in minutes"
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

### Alvin Ashcraft

- Website: [alvinashcraft.com](https://www.alvinashcraft.com)
- GitHub: [@alvinashcraft](https://github.com/alvinashcraft)

## Acknowledgments

- Built for the developer community to streamline blog content curation
- Designed to work seamlessly with the "Dew Drop" series workflow
- Special thanks to the VS Code extension API team for excellent documentation
