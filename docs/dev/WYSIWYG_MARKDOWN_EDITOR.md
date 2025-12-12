# WYSIWYG Markdown Editor Implementation

## Overview

This document describes the implementation of the EasyMDE-based WYSIWYG editor for Markdown files in the Dev Feed Curator extension, added in version 3.x.

## Implementation History

- **Initial Implementation**: December 9, 2025 (StackEdit-based)
- **Updated to EasyMDE**: December 11, 2025 (replaced StackEdit for better theme control and dark mode support)

## Changes Made

### 1. Dependencies

- **Current**: EasyMDE 2.18.0 (loaded from CDN) for Markdown WYSIWYG editing
- **Current**: Font Awesome 6.4.0 (loaded from CDN) for toolbar icons
- **Previous**: stackedit-js@1.0.7 (replaced due to dark mode limitations)

### 2. New Files Created

#### `/webview/markdown-editor.html`

A new webview HTML file that provides:

- Minimal HTML structure with placeholders for dynamic content
- Links to external CSS and JavaScript files (zero inline code for strict CSP compliance)
- Button controls: Save, Save & Close, Save & Publish, and Cancel
- VS Code theme integration via data attribute
- **Completely clean HTML**: No inline scripts, styles, or event handlers

#### `/webview/markdown-editor.css`

External stylesheet containing:

- Complete editor styling using VS Code CSS variables
- Dark mode and light mode support
- Toolbar, preview pane, and button bar styling
- Error message styling for CDN failures
- Responsive layout adjustments

#### `/webview/markdown-editor.js`

External JavaScript file containing:

- EasyMDE initialization and configuration
- State management for content and dirty tracking
- Event handlers for save operations and keyboard shortcuts
- VS Code API message passing
- Error handling for initialization failures
- Last saved timestamp management

**Key Features:**

- EasyMDE editor with live preview (side-by-side, preview-only, or fullscreen modes)
- Rich formatting toolbar with Font Awesome icons
- Dark mode support that matches VS Code theme
- Auto-focus on editor for immediate typing
- Ctrl+S / Cmd+S keyboard shortcut for saving
- Status bar with line count, word count, and cursor position
- Automatic list continuation and keyboard shortcuts

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

- Updated `openWysiwygEditorCommand` to handle both HTML and Markdown files
- Command now detects file type based on extension (`.html`, `.md`, `.markdown`)
- Passes appropriate `fileType` parameter to `editorManager.openEditor()`
- Provides unified command for all WYSIWYG editing needs
- Single command reduces maintenance burden and code duplication

#### `/package.json`

**Changes:**

- Updated command title to "Open in WYSIWYG Editor" (handles both HTML and Markdown)
- Updated editor toolbar button to appear for both HTML and Markdown files
- Button uses `when` clause: `resourceExtname == .html || resourceExtname == .md || resourceExtname == .markdown`
- Button appears in navigation group when any supported file type is active

#### `/.gitignore`

**Changes:**

- Added `test-markdown-editor.md` to exclude test file from repository

## How It Works

### For Users

1. **Open a Markdown file** (`.md` or `.markdown` extension)
2. **Click the editor icon** in the VS Code toolbar (or use Command Palette: "Dev Feed Curator: Open Markdown in WYSIWYG Editor")
3. **EasyMDE editor opens** with the content ready to edit
4. **Use the toolbar** for rich formatting:
   - Bold, italic, heading levels
   - Links, images, code blocks
   - Lists (ordered and unordered)
   - Preview, side-by-side, and fullscreen modes
5. **Live preview** updates as you type (when enabled)
6. **Editor automatically matches** your VS Code theme (dark/light)
7. **Save options:**
   - **Save**: Keep editor open
   - **Save & Close**: Save and close the editor
   - **Save & Publish**: Save and trigger WordPress publishing workflow
   - **Cancel**: Close without saving (with confirmation if changes exist)

### Technical Implementation

1. **File Detection**: Extension detects `.md` and `.markdown` files
2. **WebView Creation**: Opens custom webview with markdown-editor.html
3. **EasyMDE Integration**:
   - Loads EasyMDE 2.18.0 from CDN (cdn.jsdelivr.net)
   - Loads Font Awesome 6.4.0 from CDN (cdnjs.cloudflare.com)
   - Initializes EasyMDE editor with toolbar, status bar, and preview options
   - Auto-focuses editor for immediate typing
4. **Theme Detection**:
   - VS Code ColorThemeKind API detects dark/light theme
   - CSS variables (--vscode-*) applied throughout for consistent theming
   - Custom CSS ensures dark mode for editor, toolbar, and preview pane
5. **Content Security Policy**: Configured to allow:
   - Script loading from cdn.jsdelivr.net (EasyMDE) and webview resources
   - Style loading from cdnjs.cloudflare.com (Font Awesome) and webview resources
   - **No 'unsafe-inline'**: All scripts and styles are in external files for maximum security
   - **Zero inline code**: HTML file contains no inline scripts or styles whatsoever
6. **Error Handling**:
   - External JS checks if EasyMDE loaded successfully on initialization
   - User-friendly error messages displayed if required resources fail to load
   - Retry button (with event listener) allows users to reload after network issues
   - Error detection happens in external JS, not inline handlers
7. **Save Handling**:
   - Markdown files: Full content replacement
   - HTML files: Preserves document structure, replaces body content only

## Benefits

1. **Live Preview**: Side-by-side editing with real-time preview
2. **Dark Mode Support**: Fully themed to match VS Code dark/light mode
3. **Familiar Workflow**: Same save/publish pattern as HTML editor
4. **WordPress Integration**: Save & Publish workflow works for Markdown files
5. **No Additional Downloads**: Uses CDN-hosted EasyMDE for zero bundle size impact
6. **Theme Consistency**: Uses VS Code CSS variables throughout for perfect integration
7. **Professional Grade**: EasyMDE is a mature, actively maintained Markdown editor
8. **Rich Toolbar**: Font Awesome icons provide clear, scalable toolbar buttons
9. **Enhanced Security**: No 'unsafe-inline' CSP directives, all scripts/styles are external
10. **Robust Error Handling**: Graceful handling of CDN failures with user-friendly error messages

## Testing

### Manual Testing Steps

1. Create or open a Markdown file
2. Verify editor icon appears in toolbar
3. Click icon to open editor
4. Verify EasyMDE loads with content
5. Test editing in the main editor area
6. Click toolbar buttons to test formatting
7. Click preview button to test side-by-side mode
8. Verify dark mode matches VS Code theme
9. Test Save functionality
10. Verify content updates in original file
11. Test Save & Close and Save & Publish
12. Test Cancel button
13. (Optional) Test error handling by blocking CDN domains in network settings

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

1. Support for custom EasyMDE configuration (custom toolbar buttons, shortcuts)
2. Offline mode with bundled EasyMDE instead of CDN
3. Markdown-to-HTML conversion for WordPress
4. Image upload integration with drag-and-drop
5. Custom CSS styling for preview pane
6. Markdown linting integration
7. Auto-save functionality
8. Spell check support

## Security Considerations

- EasyMDE loads from `https://cdn.jsdelivr.net` (trusted CDN)
- Font Awesome loads from `https://cdnjs.cloudflare.com` (trusted CDN)
- Content Security Policy restricts allowed domains
- **No 'unsafe-inline' directives**: All scripts and styles are external files served through webview
- CSP only allows specific CDN sources, preventing XSS attacks
- No user credentials or sensitive data sent externally
- Content remains local to VS Code webview
- No cross-origin iframes (unlike previous StackEdit implementation)
- Error handling prevents silent failures from compromising user experience

## Compatibility

- **VS Code Version**: 1.75.0 or higher (extension requirement)
- **EasyMDE Version**: 2.18.0
- **Font Awesome Version**: 6.4.0
- **Browser Requirements**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Operating Systems**: All platforms supported by VS Code (Windows, macOS, Linux)

## Known Limitations

1. Requires internet connection for EasyMDE and Font Awesome (CDN-hosted)
2. First load may have slight delay while downloading libraries
3. Some advanced EasyMDE features may not be configured
4. Markdown formatting preferences are EasyMDE's defaults

## References

- [EasyMDE GitHub Repository](https://github.com/Ionaru/easy-markdown-editor)
- [EasyMDE Documentation](https://github.com/Ionaru/easy-markdown-editor#configuration)
- [Font Awesome Icons](https://fontawesome.com/)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## Summary

This implementation successfully extends the Dev Feed Curator extension's WYSIWYG editing capabilities to Markdown files using the EasyMDE library. The integration provides a seamless editing experience that matches the existing HTML editor workflow while leveraging EasyMDE's powerful Markdown editing features. The switch from StackEdit to EasyMDE was made to support proper dark mode theming and provide better control over the editor's appearance to match VS Code's theme.

## Dependencies

- **EasyMDE**: 2.18.0 (CDN)
  - Repository: <https://github.com/Ionaru/easy-markdown-editor>
  - CDN: <https://cdn.jsdelivr.net/npm/easymde@2.18.0/dist/easymde.min.js>

- **Font Awesome**: 6.4.0 (CDN)
  - Website: <https://fontawesome.com/>
  - CDN: <https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css>

- **Previous**: stackedit-js ^1.0.7 (replaced on December 11, 2025)
