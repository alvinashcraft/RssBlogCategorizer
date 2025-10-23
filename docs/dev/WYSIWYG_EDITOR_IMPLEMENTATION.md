# WYSIWYG Editor Implementation - v2.0.0

## Overview
Successfully implemented a TinyMCE-based WYSIWYG editor for the RSS Blog Categorizer extension. This feature allows you to visually edit exported HTML blog posts before publishing them to WordPress.

## What Was Implemented

### 1. **New Files Created**
- **`src/editorManager.ts`** - Core editor management class that handles webview creation, TinyMCE initialization, and content updates
- **`webview/editor.html`** - HTML template for the TinyMCE editor interface with VS Code theming
- **`media/tinymce/`** - Complete TinyMCE library copied from node_modules (all necessary assets, plugins, themes, and skins)

### 2. **Modified Files**

#### `src/extension.ts`
- Added import for `EditorManager`
- Created `editorManager` instance
- Registered new command: `rssBlogCategorizer.openWysiwygEditor`
- Command opens the WYSIWYG editor for any active HTML file
- Integrated with existing WordPress publishing workflow

#### `src/exportManager.ts`
- Added prompt after HTML export to optionally open the file in the WYSIWYG editor
- Provides seamless workflow: Export → Edit → Publish

#### `package.json`
- Added `tinymce` dependency (v8.1.2)
- Added `copy-webpack-plugin` dev dependency
- Registered new command with edit icon in editor toolbar
- Added menu contribution to show edit button when viewing HTML files
- Updated version to 2.0.0

#### `webpack.config.js`
- Added `CopyPlugin` to copy `media/` and `webview/` directories during build
- Ensures TinyMCE assets are included in the compiled extension

#### `tsconfig.json`
- Excluded `media`, `webview`, and `dist` directories from TypeScript compilation
- Prevents TypeScript from trying to compile TinyMCE's `.ts` skin files

#### `.vscodeignore`
- Added exceptions to include `media/**` and `webview/**` in the packaged extension
- Ensures all necessary assets are distributed with the extension

## Features

### Editor Capabilities
- **Full WYSIWYG Editing**: Rich text editing with TinyMCE's powerful editor
- **Browser Spellcheck**: Native spellcheck with red underlines and right-click correction suggestions
- **Toolbar Actions**: 
  - Text formatting (bold, italic, colors)
  - Alignment options
  - Lists (bullets, numbers)
  - Links and images
  - Code view
  - Undo/Redo
- **Multiple Plugins**: advlist, autolink, lists, link, image, charmap, preview, anchor, searchreplace, visualblocks, code, fullscreen, insertdatetime, media, table, help, wordcount

### VS Code Integration
- **Native Theming**: Editor respects VS Code color themes
- **Keyboard Shortcuts**: Ctrl+S (Cmd+S on Mac) saves changes
- **State Management**: Editor content is preserved when panel is hidden
- **Unsaved Changes Warning**: Prompts before closing with unsaved edits

### Workflow Actions
1. **Save Changes**: Updates the original HTML file
2. **Save & Publish**: Saves and prompts to publish to WordPress
3. **Cancel**: Closes editor (with confirmation if there are unsaved changes)

## Usage

### Opening the Editor

**Method 1: From Exported HTML**
1. Export blog posts as HTML using the extension
2. When prompted, click "Open in Editor"
3. Make your edits
4. Choose "Save Changes" or "Save & Publish"

**Method 2: From Any HTML File**
1. Open any HTML file in VS Code
2. Click the edit icon (📝) in the editor toolbar
3. Make your edits in the WYSIWYG editor
4. Save when finished

**Method 3: Command Palette**
1. Open an HTML file
2. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
3. Type "RSS Blog Categorizer: Open in WYSIWYG Editor"
4. Press Enter

### Publishing Workflow
1. Export posts to HTML
2. Optionally edit in WYSIWYG editor
3. Click "Save & Publish" to trigger WordPress publishing
4. Or manually publish using the existing WordPress publish command

## Technical Details

### Security
- Webview uses Content Security Policy with appropriate restrictions
- Uses `webview.asWebviewUri()` for secure resource loading
- TinyMCE assets are loaded from local extension directory

### Communication
- Extension ↔ Webview communication via `postMessage` API
- Messages: `save`, `saveAndPublish`, `cancel`, `updateContent`
- Uses VS Code's state API to persist editor content

### Resource Management
- TinyMCE base URL configured dynamically for webview context
- All plugins, themes, and skins copied to extension package
- Total TinyMCE assets: ~10MB (plugins, skins, themes, models, icons)

## Testing Checklist

### Basic Functionality
- [ ] Editor opens when clicking the edit icon on an HTML file
- [ ] TinyMCE loads with all toolbar buttons visible
- [ ] Can type and format text in the editor
- [ ] Browser spellcheck shows red underlines for misspelled words
- [ ] Right-click on misspelled words shows correction suggestions
- [ ] Save button updates the original HTML file
- [ ] Cancel button closes the editor without saving
- [ ] Unsaved changes prompt appears when closing with changes

### Integration
- [ ] After HTML export, "Open in Editor" prompt appears
- [ ] Save & Publish button triggers WordPress publishing workflow
- [ ] Editor respects VS Code color theme
- [ ] Keyboard shortcut Ctrl+S saves changes
- [ ] State is preserved when switching VS Code tabs

### Edge Cases
- [ ] Works with untitled HTML files
- [ ] Handles large HTML documents
- [ ] Properly escapes special characters in HTML content
- [ ] Error handling for missing files or permissions issues

## Development Notes

### Build Process
```bash
npm install           # Installs dependencies including TinyMCE
npm run compile       # Builds extension with webpack
npm run package       # Creates production build
```

### File Structure
```
DevFeedCategorizer/
├── src/
│   ├── editorManager.ts       # WYSIWYG editor logic
│   ├── extension.ts           # Registers editor command
│   └── exportManager.ts       # Export with editor prompt
├── webview/
│   └── editor.html            # TinyMCE webview template
├── media/
│   └── tinymce/               # Complete TinyMCE distribution
│       ├── tinymce.min.js
│       ├── themes/
│       ├── plugins/
│       ├── skins/
│       └── ...
└── dist/                      # Compiled output (gitignored)
    ├── extension.js
    ├── media/                 # Copied by webpack
    └── webview/               # Copied by webpack
```

### Configuration
No additional configuration required. TinyMCE runs with default settings optimized for blog post editing.

## Known Limitations
- Editor requires HTML file to be open in active editor
- TinyMCE adds ~10MB to extension package size
- Image uploads not implemented (links to external images work)
- Custom TinyMCE plugins not included (can be added if needed)

## Future Enhancements
- Image upload/insertion from local files
- Custom snippets for common blog post patterns
- Preview mode that matches WordPress theme
- Markdown export from WYSIWYG content
- Auto-save functionality
- Multi-document editing support

## Version History

- **v2.1.2** (October 23, 2025) - Added browser spellcheck integration with red underlines and right-click corrections
- **v2.0.0** (October 16, 2025) - Initial WYSIWYG editor implementation with TinyMCE

## Support
For issues or feature requests, please create an issue on the GitHub repository:
https://github.com/alvinashcraft/RssBlogCategorizer/issues

---

**Implementation Complete!** 🎉

The WYSIWYG editor is ready for testing. Press F5 in VS Code to launch the Extension Development Host and try it out!
