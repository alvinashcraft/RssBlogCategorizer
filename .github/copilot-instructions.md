# GitHub Copilot Custom Instructions

## Project Overview

This is a Visual Studio Code extension called "Dev Feed Curator" that fetches RSS feeds from developer blogs, automatically categorizes posts by technology topics, and provides export functionality in HTML and Markdown formats for blog publishing.

## Development Guidelines

### Documentation and Testing Protocol

- **Always check documentation**: After implementing any fix or new feature, review and update the `README.md` file and any relevant documentation in the `docs/` folder
- **Always check tests**: After implementing any fix or new feature, add or update corresponding tests in the `src/test/` directory
- **Fix markdown linting**: Always address markdown linting issues when creating or updating documentation files to maintain proper formatting and readability
- **Documentation structure**: 
  - General documentation goes in `docs/`
  - Developer-specific documentation goes in `docs/dev/`
  - Keep documentation current with code changes

### Communication Style

- Use a familiar but professional tone
- Avoid overly-agreeable statements like "You're absolutely right" or "Great idea"
- Be direct and helpful without being overly enthusiastic
- Focus on practical solutions and clear explanations

### Version and Publishing Control

- **Never update version**: Do not modify the version number in `package.json` unless explicitly requested
- **Never auto-publish**: Do not publish to the VS Code Marketplace automatically or suggest doing so without explicit user request
- **Package updates**: Only check for npm package updates after the project's version number in `package.json` has been explicitly updated

### File Management

- **Source control exclusions**: Always determine whether newly added files should be excluded from source control (`.gitignore`) or the VS Code extension package (`.vscodeignore`)
- **Package exclusions**: Ensure development files, tests, and documentation don't bloat the extension package
- **File placement**: Follow the existing project structure and conventions

### Code Quality

- **Always compile**: Ensure new and updated code compiles successfully by running `npm run compile` before considering work complete
- **Type safety**: Maintain TypeScript type safety throughout the codebase
- **Error handling**: Include appropriate error handling and logging for new functionality

## Project-Specific Context

### Key Technologies
- TypeScript
- VS Code Extension API
- RSS/Atom feed parsing (fast-xml-parser)
- NewsBlur API integration
- WordPress REST API
- HTTPS requests and XML parsing

### Main Components
- `rssProvider.ts`: RSS feed fetching, parsing, and categorization
- `exportManager.ts`: HTML/Markdown generation and file operations  
- `wordpressManager.ts`: WordPress publishing functionality
- `editorManager.ts`: VS Code editor integrations
- `extension.ts`: Main extension entry point

### Testing Structure
- `src/test/basic/`: Pure TypeScript logic tests (no VS Code dependencies)
- `src/test/unit/`: Component tests with VS Code API mocking
- `src/test/suite/`: End-to-end integration tests

### Configuration Files
- `categories.json`: Post categorization rules
- `authorMappings.json`: Author name normalization mappings
- `books.json`: Book recommendations data

### Build Process
- Use `npm run compile` to build TypeScript
- Use `npx vsce package` to create extension package
- Tests run with `npm run test:basic` (fast) or `npm test` (full)

## Current Focus Areas

- Date filtering improvements for RSS feeds
- NewsBlur API integration enhancements  
- WordPress publishing workflow
- Intelligent post categorization
- Export functionality optimization

Remember to maintain the existing code quality standards and follow the established patterns when making modifications or additions.