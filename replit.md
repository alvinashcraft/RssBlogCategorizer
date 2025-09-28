# RSS Blog Categorizer VS Code Extension

## Overview

A VS Code extension that fetches RSS feeds from developer blogs, categorizes posts by topics, and provides export functionality in HTML and Markdown formats for blog publishing. Originally created with Replit. Enhanced in VS Code by GitHub Copilot with Claude Sonnet 4.

## Recent Changes

- **September 23, 2025**: Created complete VS Code extension with RSS parsing, categorization, tree view, and export functionality
- **Architecture**: Implemented proper async/await patterns for RSS feed loading and UI updates
- **Bug Fixes**: Resolved critical refresh flow issues, improved RSS/Atom parsing with redirect handling, fixed export URI handling

## Project Architecture

### Core Components

- **`src/extension.ts`**: Main extension entry point with command registration and lifecycle management
- **`src/rssProvider.ts`**: RSS feed parser and tree data provider for VS Code sidebar
- **`src/exportManager.ts`**: HTML and Markdown export functionality with customizable templates
- **`package.json`**: VS Code extension manifest with commands, views, and configuration schema
- **`tsconfig.json`**: TypeScript configuration for compilation

### Key Features

1. **RSS Feed Parsing**: Fetches and parses RSS/Atom feeds with redirect handling and robust error handling
2. **Smart Categorization**: Automatically categorizes posts by technology (JavaScript, Python, DevOps, etc.)
3. **Tree View Integration**: Displays categorized posts in VS Code sidebar with expandable categories
4. **Export Functionality**: Generates HTML and Markdown files with professional templates
5. **Configuration**: Customizable RSS feed URLs and refresh intervals
6. **Auto-refresh**: Configurable automatic feed updates

### Development Workflow

- **TypeScript Compilation**: `npm run compile` for one-time build, `npm run watch` for development
- **VS Code Extension Host**: Use F5 to launch extension development host for testing
- **Configuration**: Managed through VS Code settings UI or settings.json

## Default RSS Feeds

- Mozilla Blog: https://blog.mozilla.org/feed/
- CSS Tricks: https://css-tricks.com/feed/
- Dev.to: https://dev.to/feed

## User Preferences

- Extension designed for developer productivity
- Focuses on clean, readable export formats suitable for blog publishing
- Minimal configuration required - works out of the box with sensible defaults