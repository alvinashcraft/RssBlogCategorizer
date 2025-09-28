# Development Guide

This guide contains developer-specific instructions for building, testing, and contributing to the RSS Blog Categorizer extension.

## Prerequisites

- Node.js (16.x or later)
- Visual Studio Code
- TypeScript

## Development Setup

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/alvinashcraft/RssBlogCategorizer.git
   cd RssBlogCategorizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile TypeScript:
   ```bash
   npm run compile
   ```

4. Watch for changes during development:
   ```bash
   npm run watch
   ```

### Installation from Source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press `F5` to launch a new Extension Development Host window

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

## Testing

1. Press `F5` to launch Extension Development Host
2. Test the extension functionality
3. Check the Debug Console for logs

## Building VSIX Package

```bash
# Install vsce globally if not already installed
npm install -g vsce

# Package the extension
vsce package
```

## Configuration Schema

The extension uses the following configuration schema:

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

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile TypeScript to JavaScript |
| `npm run watch` | Watch for changes and recompile |
| `npm run package` | Build production package |
| `npm run vscode:prepublish` | Pre-publish script (runs package) |

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow existing TypeScript conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Ensure proper error handling

### Testing Guidelines

- Test all new features thoroughly
- Verify the extension works in both development and packaged modes
- Check that configuration changes work as expected
- Validate export functionality with different feed formats

## Troubleshooting

### Common Issues

1. **Extension not loading**: Check the Debug Console for errors
2. **Feed parsing errors**: Verify RSS feed URL and format
3. **Export failures**: Ensure proper file permissions in target directory

### Debug Mode

Press `F5` to launch the Extension Development Host with debug capabilities:

- Set breakpoints in TypeScript files
- Use `console.log()` for debugging output
- Check the Debug Console for extension logs

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG if applicable
3. Run tests to ensure everything works
4. Build VSIX package: `vsce package`
5. Test the packaged extension
6. Create release and upload VSIX file

## Architecture Overview

The extension follows a modular architecture:

- **extension.ts**: Entry point, registers commands and providers
- **rssProvider.ts**: Handles RSS feed parsing and tree view data
- **exportManager.ts**: Manages HTML and Markdown export functionality

The extension uses VS Code's TreeDataProvider API to display categorized posts and integrates with the workspace file system for exports.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.