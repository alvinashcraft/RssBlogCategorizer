# v2.0.0 Release Notes - WYSIWYG Editor

## 🎉 Major New Feature: WYSIWYG Editor

Version 2.0.0 introduces a powerful WYSIWYG (What You See Is What You Get) editor powered by TinyMCE, allowing you to visually edit your Dew Drop posts before publishing!

## What's New

### Visual HTML Editor
- **TinyMCE Integration**: Professional-grade rich text editor built right into VS Code
- **Rich Formatting**: Bold, italic, colors, headings, links, images, and more
- **Live Preview**: See exactly how your content will look
- **VS Code Theme Support**: Editor automatically matches your VS Code theme

### Seamless Workflow
1. **Export** your categorized posts to HTML (as before)
2. **Edit** with the new WYSIWYG editor (new!)
3. **Publish** directly to WordPress (as before)

### How to Use

#### Quick Access
When you export blog posts to HTML, you'll now see a prompt asking if you want to open the file in the WYSIWYG editor. Just click "Open in Editor" and start editing!

#### Manual Access
- Click the **edit icon (📝)** in the toolbar when viewing any HTML file
- Or use Command Palette: `Dev Feed Curator: Open in WYSIWYG Editor`

### Editor Actions
- **Save Changes**: Updates the HTML file with your edits
- **Save & Publish**: Saves and opens the WordPress publishing dialog
- **Cancel**: Close without saving (with confirmation if you have unsaved changes)

### Keyboard Shortcuts
- `Ctrl+S` (or `Cmd+S` on Mac): Quick save
- Standard text editing shortcuts work as expected

## Technical Improvements

### Build System
- Added webpack plugin to properly bundle TinyMCE assets
- Optimized TypeScript configuration to exclude media files
- Updated package structure for cleaner distribution

### Dependencies
- Added TinyMCE 8.1.2 for rich text editing
- Added copy-webpack-plugin for asset management

## Full Details

For complete implementation details, testing checklists, and technical documentation, see [`WYSIWYG_EDITOR_IMPLEMENTATION.md`](WYSIWYG_EDITOR_IMPLEMENTATION.md).

## Upgrade Notes

This is a **major version update** (1.x → 2.0.0) due to the significant new functionality. The extension package size has increased by approximately 10MB to include the TinyMCE library and all its assets.

All existing features continue to work exactly as before - this is purely additive functionality!

## Feedback

Please report any issues or feature requests on our GitHub repository:
https://github.com/alvinashcraft/RssBlogCategorizer/issues

---

**Happy Editing!** 📝✨
