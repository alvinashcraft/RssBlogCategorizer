# RSS Blog Categorizer

A Visual Studio Code extension that fetches RSS feeds from developer blogs, automatically categorizes posts by technology topics, and provides export functionality in HTML and Markdown formats for blog publishing.

## Features

- 📡 **RSS Feed Parsing** - Fetches and parses RSS/Atom feeds with robust error handling
- 🔐 **NewsBlur API Integration** - Optionally use NewsBlur API for authenticated access to get more than 25 items
- 🏷️ **Smart Categorization** - Automatically categorizes posts by technology (JavaScript, Python, DevOps, etc.)
- 🌳 **Tree View Integration** - Displays categorized posts in VS Code sidebar with expandable categories
- 📄 **Export Functionality** - Generates HTML and Markdown files with professional templates
- ⚙️ **Configurable Settings** - Customizable RSS feed URLs, refresh intervals, and date filtering
- 🔄 **Auto-refresh** - Configurable automatic feed updates
- 📚 **Book Recommendations** - Includes "The Geek Shelf" section with rotating book recommendations

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions view (`Ctrl+Shift+X`)
3. Search for "RSS Blog Categorizer"
4. Click Install

### From VSIX Package

1. Download the `.vsix` file from the [releases](https://github.com/alvinashcraft/RssBlogCategorizer/releases)
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X`)
4. Click the three dots menu and select "Install from VSIX..."
5. Select the downloaded `.vsix` file

## Usage

### Getting Started

1. After installation, the "Dev Blog Posts" view will appear in the Explorer panel sidebar
2. If you don't see the view, try opening the Command Palette (`Ctrl+Shift+P`) and running "RSS Blog Categorizer: Refresh" to activate the extension
3. The extension comes pre-configured with a default RSS feed
4. Click the refresh button in the view header to load the latest posts
5. Posts are automatically categorized and displayed in a tree structure

### Setting Up Your RSS Feed

**Via Explorer Panel:**

1. Click the edit icon (pencil) in the "Dev Blog Posts" view header
2. Enter your RSS feed URL when prompted

**Via Command Palette:**

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "RSS Blog Categorizer: Set RSS Feed"
3. Enter your RSS feed URL when prompted

The feed will automatically refresh with new content after updating.

### NewsBlur API Integration (Optional)

For enhanced functionality, you can configure NewsBlur API access to retrieve more than 25 items:

1. **Enable NewsBlur API**: Set `rssBlogCategorizer.useNewsblurApi` to `true` in settings
2. **Set Username**: Configure your NewsBlur username in `rssBlogCategorizer.newsblurUsername`
3. **Set Credentials**: Use Command Palette → "RSS Blog Categorizer: Set NewsBlur Credentials" to securely store your password

**Benefits of NewsBlur API:**

- Access more than 25 feed items (RSS feeds are typically limited to 25)
- More reliable access to popular feeds
- Better handling of feed redirects and updates

### Exporting Posts

**Via Explorer Panel:**

1. Click "Export as Markdown" or "Export as HTML" from the "Dev Blog Posts" view menu

**Via Command Palette:**

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "RSS Blog Categorizer: Export as Markdown" or "RSS Blog Categorizer: Export as HTML"

**Export Process:**

1. Choose your save location
2. The exported file will include:
   - Auto-generated "Dew Drop" title with incremental numbering
   - Categorized posts with author attribution
   - "The Geek Shelf" section with book recommendations

## Configuration

Access settings via `File > Preferences > Settings` and search for "RSS Blog Categorizer":

- **Feed URL**: Single RSS feed URL to monitor
- **Record Count**: Number of records to retrieve (10-500)
- **Minimum DateTime**: Filter posts by publication date (UTC format)
- **Refresh Interval**: Auto-refresh interval in minutes
- **Use NewsBlur API**: Enable NewsBlur API integration for enhanced functionality
- **NewsBlur Username**: Your NewsBlur account username (password stored securely)

### Smart Date Filtering

The extension uses intelligent date filtering:

1. **Automatic Mode** (default): Uses the publication date of the latest "Dew Drop" post from alvinashcraft.com
2. **Fallback**: If unavailable, filters to posts from the last 24 hours (UTC)
3. **Manual Override**: Set a custom UTC datetime in settings

Example UTC formats:

- `2025-01-01T00:00:00Z` (midnight UTC)
- `2025-09-27T12:00:00.000Z` (with milliseconds)

## Category Customization

You can customize how posts are categorized by editing the `categories.json` file in your extension directory. Posts are automatically sorted into categories based on keywords in their titles.

See [CATEGORIES.md](docs/CATEGORIES.md) for detailed configuration instructions.

## Available Commands

| Command | Description |
|---------|-------------|
| `RSS Blog Categorizer: Refresh` | Refresh the RSS feed |
| `RSS Blog Categorizer: Export as Markdown` | Export posts to Markdown |
| `RSS Blog Categorizer: Export as HTML` | Export posts to HTML |
| `RSS Blog Categorizer: Set RSS Feed` | Configure RSS feed URL |
| `RSS Blog Categorizer: Set NewsBlur Credentials` | Securely configure NewsBlur API credentials |

All commands are accessible through the Command Palette (`Ctrl+Shift+P`) or the extension's tree view interface.

## Development

Interested in contributing or building from source? See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed development setup, building instructions, testing guidelines, and contribution information.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

### Alvin Ashcraft

- Website: [alvinashcraft.com](https://www.alvinashcraft.com)
- GitHub: [@alvinashcraft](https://github.com/alvinashcraft)

---

*Built for the developer community to streamline blog content curation and designed to work seamlessly with the "Dew Drop" series workflow.*
