# RSS Blog Categorizer

A Visual Studio Code extension that fetches RSS feeds from developer blogs, automatically categorizes posts by technology topics, and provides export functionality in HTML and Markdown formats for blog publishing.

## Features

- 📡 **RSS Feed Parsing** - Fetches and parses RSS/Atom feeds with robust error handling
- 🔐 **NewsBlur API Integration** - Optionally use NewsBlur API for authenticated access to get more than 25 items
- 🏷️ **Smart Categorization** - Automatically categorizes posts by technology (JavaScript, Python, DevOps, etc.)
- 🌳 **Tree View Integration** - Displays categorized posts in VS Code sidebar with expandable categories
- 📄 **Export Functionality** - Generates HTML and Markdown files with professional templates
- 🚀 **WordPress Publishing** - Direct publishing to WordPress blogs via REST API with secure credential storage
- 🏷️ **Automatic Tag Detection** - Intelligent extraction of technology tags from blog post content
- ⚙️ **Configurable Settings** - Customizable RSS feed URLs, refresh intervals, and date filtering
- 🔄 **Optional Auto-refresh** - Configurable automatic feed updates (disabled by default for on-demand usage)
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
2. The extension comes pre-configured with a default RSS feed
3. **Click the refresh button** in the view header to load posts (no automatic refresh on startup)
4. Posts are automatically categorized and displayed in a tree structure
5. **Optional**: Enable auto-refresh in settings if you want automatic updates

### Setting Up Your RSS Feed

**Via Explorer Panel:**

1. Click the edit icon (pencil) in the "Dev Blog Posts" view header
2. Enter your RSS feed URL when prompted

**Via Command Palette:**

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "RSS Blog Categorizer: Set RSS Feed"
3. Enter your RSS feed URL when prompted

Click the refresh button to load new content after updating the feed URL.

### Manual vs Automatic Refresh

By default, the extension uses **manual refresh** for better performance and control:

- **Manual Mode** (default): Click the refresh button when you want to check for new posts
- **Automatic Mode** (optional): Enable "Auto Refresh" in settings for periodic updates

Manual refresh is recommended for most users as it prevents unnecessary network requests and provides better control over when data is updated.

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

1. Choose your save location (filename is auto-generated from the blog post title)
2. The exported file will include:
   - Auto-generated "Dew Drop" title with incremental numbering
   - Categorized posts with author attribution
   - "The Geek Shelf" section with book recommendations

**Default Filename**: Files are automatically named using the blog post title, for example:

- `Dew_Drop_October_11_2025_4517.html`
- `Dew_Drop_October_11_2025_4517.md`

### Publishing to WordPress

After exporting to HTML, you can publish directly to your WordPress blog:

**Prerequisites:**

1. **Configure WordPress Settings**: Set your blog URL and username in settings
2. **Set Credentials**: Use Command Palette → "RSS Blog Categorizer: Set WordPress Credentials" to securely store your login

**Publishing Process:**

1. **Export to HTML** first using the export functionality above
2. **Open the HTML file** in VS Code editor
3. **Click the WordPress publish button** in the editor toolbar (cloud upload icon)
   - Or use Command Palette → "RSS Blog Categorizer: Publish to WordPress"
   - Only the content inside `<body>` tags is published (excludes `<html>`, `<head>`, etc.)
4. **Choose categories**: Use default categories (configurable in settings), customize for this post, or publish without categories
5. **Review auto-detected tags**: The extension automatically detects technology tags from content - use detected tags, customize them, or skip
6. **Choose publish status**: Publish immediately or save as draft
7. **Confirmation**: The extension will confirm successful publication with the post ID, assigned categories, and tag count

**WordPress Setup Requirements:**

- WordPress site with REST API enabled (enabled by default in WordPress 4.7+)
- WordPress user account with publishing permissions
- Application Password for secure authentication (recommended for WordPress 5.6+)

**Automatic Tag Detection:**

The extension automatically analyzes your blog post content and detects relevant technology tags including:

- **Frameworks & Platforms**: .NET, ASP.NET Core, Blazor, React, Node.js, Uno Platform
- **Programming Languages**: C#, JavaScript, TypeScript, Python, Go, Swift, Kotlin
- **Cloud & DevOps**: Azure, AWS, Docker, Kubernetes, TeamCity
- **AI & ML**: ChatGPT, Copilot, Claude, Gemini, Perplexity
- **Mobile & IoT**: Android, iOS, Raspberry Pi
- **Databases**: SQL Server, MySQL, PostgreSQL
- **Tools**: Visual Studio, VS Code, Android Studio, Playwright
- **And 50+ more technology keywords**

The system intelligently matches content against a comprehensive technology keyword database and presents detected tags for your review before publishing.

**Security Notes:**

- WordPress credentials are stored securely using VS Code's built-in SecretStorage
- Passwords are never stored in plain text or configuration files
- Use WordPress Application Passwords for enhanced security when available

## Configuration

Access settings via `File > Preferences > Settings` and search for "RSS Blog Categorizer":

- **Feed URL**: Single RSS feed URL to monitor
- **Record Count**: Number of records to retrieve (10-500)
- **Minimum DateTime**: Filter posts by publication date (UTC format)
- **Enable Auto Refresh**: Turn on automatic feed updates (disabled by default)
- **Refresh Interval**: Auto-refresh interval in minutes (when auto-refresh is enabled)
- **Use NewsBlur API**: Enable NewsBlur API integration for enhanced functionality
- **NewsBlur Username**: Your NewsBlur account username (password stored securely)
- **WordPress Blog URL**: Your WordPress blog URL (e.g., `https://yourblog.com`)
- **WordPress Username**: Your WordPress account username (password stored securely)
- **WordPress Categories**: Default categories to assign to published posts (e.g., "Daily Links", "Development")

**Note**: Tags are automatically detected from content and don't require configuration - the system analyzes your blog post and suggests relevant technology tags during publishing.

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
| `RSS Blog Categorizer: Set WordPress Credentials` | Securely configure WordPress publishing credentials |
| `RSS Blog Categorizer: Publish to WordPress` | Publish HTML file to WordPress blog |

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
