# Development Guide

This guide contains developer-specific instructions for building, testing, and contributing to the Dev Feed Curator extension.

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
├── exportManager.ts   # HTML/Markdown export functionality
└── wordpressManager.ts # WordPress REST API publishing
categories.json        # Category configuration
books.json            # Book recommendations for exports
package.json          # Extension manifest
```

## Testing

The extension includes comprehensive unit and integration tests.

### Running Tests

```bash
# Run unit tests (recommended for development)
npm run test:unit

# Run all tests including integration tests
npm test

# Compile and run unit tests
npm run compile-tests
npm run test:unit:compiled
```

### Test Structure

- `src/test/unit/` - Unit tests for individual components
- `src/test/suite/` - Integration tests in VS Code environment  
- `src/test/mocks/` - Mock data and VS Code API implementations

See [src/test/README.md](src/test/README.md) for detailed testing documentation.

### Manual Testing

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
    "default": 100,
    "minimum": 10,
    "maximum": 500,
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
  },
  "rssBlogCategorizer.enableAutoRefresh": {
    "type": "boolean",
    "default": false,
    "description": "Enable automatic refresh of RSS feed data"
  },
  "rssBlogCategorizer.useNewsblurApi": {
    "type": "boolean",
    "default": false,
    "description": "Use NewsBlur API for enhanced functionality"
  },
  "rssBlogCategorizer.wordpressBlogUrl": {
    "type": "string",
    "default": "",
    "description": "WordPress blog URL for publishing"
  },
  "rssBlogCategorizer.wordpressUsername": {
    "type": "string",
    "default": "",
    "description": "WordPress username for publishing"
  },
  "rssBlogCategorizer.wordpressCategories": {
    "type": "array",
    "default": ["Daily Links", "Development"],
    "description": "Default WordPress categories for published posts"
  },
  "rssBlogCategorizer.openLinksInNewTab": {
    "type": "boolean",
    "default": false,
    "description": "Open links in a new browser tab when clicked"
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
- Test WordPress publishing with different authentication methods

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
- **wordpressManager.ts**: Handles WordPress REST API publishing and authentication

The extension uses VS Code's TreeDataProvider API to display categorized posts, integrates with the workspace file system for exports, and provides secure WordPress publishing via REST API.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
