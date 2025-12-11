# WYSIWYG Markdown Editor Implementation

## Overview

This document describes the implementation of the StackEdit-based WYSIWYG editor for Markdown files in the Dev Feed Curator extension, added in version 3.x.

## Implementation Date

December 9, 2025

## Changes Made

### 1. Dependencies

- **Added**: `stackedit-js@1.0.7` npm package for Markdown WYSIWYG editing

### 2. New Files Created

#### `/webview/markdown-editor.html`

A new webview HTML file that provides:

- A textarea for direct Markdown editing
- Integration with StackEdit.js for WYSIWYG editing via iframe
- Button controls: WYSIWYG Edit, Save, Save & Close, Save & Publish, and Cancel
- State management for content and dirty tracking
- Last saved timestamp display
- VS Code theme integration

**Key Features:**

- Direct textarea editing for quick text-based Markdown editing
- "WYSIWYG Edit" button opens StackEdit editor in an iframe overlay
- StackEdit provides rich WYSIWYG editing with live preview
- Changes from StackEdit automatically sync back to textarea
- Ctrl+S / Cmd+S keyboard shortcut for saving
- Unsaved changes warning on cancel

### 3. Modified Files

#### `/src/editorManager.ts`

**Changes:**

- Added `editorType` property to track 'html' or 'markdown' mode
- Updated `openEditor()` method signature to accept `fileType` parameter
- Created `getMarkdownWebviewContent()` method for Markdown editor
- Refactored `getWebviewContent()` to route to appropriate editor type
- Updated `saveContent()` to handle Markdown files (full content replacement)
- Modified `formatDocument()` to skip formatting for Markdown files
- Preserved all existing HTML editor functionality
- Provides appropriate user feedback for Markdown files

#### `/src/extension.ts`

**Changes:**

- Added `openMarkdownEditorCommand` command registration
- Added command to `context.subscriptions`
- New command checks for `.md` and `.markdown` file extensions
- Updated `openWysiwygEditorCommand` to explicitly pass `fileType: 'html'`

#### `/package.json`

**Changes:**

- Added `rssBlogCategorizer.openMarkdownEditor` command definition
- Updated HTML editor command title for clarity: "Open HTML in WYSIWYG Editor"
- Added editor toolbar button for Markdown files (`.md` and `.markdown` extensions)
- Button appears in navigation group when Markdown file is active

#### `/.gitignore`

**Changes:**

- Added `test-markdown-editor.md` to exclude test file from repository

## How It Works

### For Users

1. **Open a Markdown file** (`.md` or `.markdown` extension)
2. **Click the editor icon** in the VS Code toolbar (or use Command Palette: "Dev Feed Curator: Open Markdown in WYSIWYG Editor")
3. **Edit directly** in the textarea for quick text changes, OR
4. **Click "WYSIWYG Edit"** button to open StackEdit's rich editor
5. **StackEdit provides:**
   - Live preview alongside editor
   - Rich formatting toolbar
   - Table editor
   - Code block syntax highlighting
   - And more Markdown editing features
6. **Changes sync automatically** from StackEdit back to the textarea
7. **Save options:**
   - **Save**: Keep editor open
   - **Save & Close**: Save and close the editor
   - **Save & Publish**: Save and trigger WordPress publishing workflow
   - **Cancel**: Close without saving (with confirmation if changes exist)

### Technical Implementation

1. **File Detection**: Extension detects `.md` and `.markdown` files
2. **WebView Creation**: Opens custom webview with markdown-editor.html
3. **StackEdit Integration**: 
   - Loads StackEdit.js from CDN (unpkg.com)
   - Creates Stackedit instance on "WYSIWYG Edit" button click
   - Opens StackEdit iframe with current content
   - Listens for `fileChange` events to sync content back
4. **Content Security Policy**: Configured to allow:
   - Script loading from unpkg.com CDN
   - StackEdit iframe from stackedit.io domain
   - VS Code webview resources
5. **Save Handling**:
   - Markdown files: Full content replacement
   - HTML files: Preserves document structure, replaces body content only

## Benefits

1. **Dual Editing Modes**: Users can choose between direct Markdown editing and WYSIWYG
2. **Familiar Workflow**: Same button pattern as HTML editor
3. **WordPress Integration**: Save & Publish workflow works for Markdown files
4. **No Additional Downloads**: Uses CDN-hosted StackEdit for zero bundle size impact
5. **Theme Consistency**: Inherits VS Code theme colors and styling
6. **Professional Grade**: StackEdit is a mature, feature-rich Markdown editor

## Testing

### Manual Testing Steps

1. Create or open a Markdown file
2. Verify editor icon appears in toolbar
3. Click icon to open editor
4. Test direct textarea editing
5. Click "WYSIWYG Edit" button
6. Verify StackEdit loads and displays content
7. Make changes in StackEdit
8. Verify changes sync back to textarea
9. Test Save functionality
10. Verify content updates in original file
11. Test Cancel with unsaved changes
12. Verify confirmation dialog appears

### Test File

Created `test-markdown-editor.md` (excluded from git) with:

- Headers
- Bold and italic text
- Links
- Code blocks
- Lists (ordered and nested)
- Tables

## Future Enhancements

Potential improvements for future versions:

1. Support for custom StackEdit configuration
2. Offline mode with bundled StackEdit
3. Markdown-to-HTML conversion for WordPress
4. Image upload integration
5. Custom CSS styling for preview
6. Markdown linting integration
7. Auto-save functionality

## Security Considerations

- StackEdit loads from `https://stackedit.io` (official domain)
- Content Security Policy restricts allowed domains
- No user credentials or sensitive data sent to StackEdit
- Content remains local to VS Code webview
- StackEdit.js loaded from trusted CDN (unpkg.com)

## Compatibility

- **VS Code Version**: 1.75.0 or higher (extension requirement)
- **StackEdit Version**: 1.0.7
- **Browser Requirements**: Modern browsers supporting iframe messaging
- **Operating Systems**: All platforms supported by VS Code

## Known Limitations

1. Requires internet connection for StackEdit (CDN-hosted)
2. StackEdit iframe may have slight loading delay
3. Some advanced StackEdit features may not be exposed
4. Markdown formatting preferences are StackEdit's defaults

## References

- [StackEdit.js Documentation](https://benweet.github.io/stackedit.js/)
- [StackEdit.js GitHub Repository](https://github.com/benweet/stackedit.js)
- [StackEdit Main Project](https://github.com/benweet/stackedit)

## Summary

This implementation successfully extends the Dev Feed Curator extension's WYSIWYG editing capabilities to Markdown files using the StackEdit.js library. The integration provides a seamless editing experience that matches the existing HTML editor workflow while leveraging StackEdit's powerful Markdown editing features.

## Dependencies

- **stackedit-js**: ^1.0.7
  - Repository: https://github.com/benweet/stackedit.js
  - Purpose: Provides WYSIWYG Markdown editing via iframe
  - License: MIT
