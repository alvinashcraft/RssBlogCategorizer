# v3.0.0 Release Notes - Rebranding to "Dev Feed Curator"

## 🎨 Major Update: New Name and Identity

Version 3.0.0 introduces a complete rebranding of the extension with a new name, updated icon, and refreshed identity that better reflects its purpose as a content curation tool.

## Breaking Changes

### ⚠️ Command Names Updated

All command names have been updated to reflect the new "Dev Feed Curator" branding. If you have keyboard shortcuts or workflows that reference the old command names, you'll need to update them:

**Old Commands → New Commands:**

- `RSS Blog Categorizer: Refresh` → `Dev Feed Curator: Refresh`
- `RSS Blog Categorizer: Export as Markdown` → `Dev Feed Curator: Export as Markdown`
- `RSS Blog Categorizer: Export as HTML` → `Dev Feed Curator: Export as HTML`
- `RSS Blog Categorizer: Set RSS Feed` → `Dev Feed Curator: Set RSS Feed`
- `RSS Blog Categorizer: Set NewsBlur Credentials` → `Dev Feed Curator: Set NewsBlur Credentials`
- `RSS Blog Categorizer: Set WordPress Credentials` → `Dev Feed Curator: Set WordPress Credentials`
- `RSS Blog Categorizer: Publish to WordPress` → `Dev Feed Curator: Publish to WordPress`
- `RSS Blog Categorizer: Open in WYSIWYG Editor` → `Dev Feed Curator: Open in WYSIWYG Editor`

### Settings Search Updated

When searching for settings in VS Code preferences, search for "Dev Feed Curator" instead of "RSS Blog Categorizer". All setting keys remain unchanged (`rssBlogCategorizer.*`).

## What's New

### 🎯 New Brand Identity

- **New Name**: "Dev Feed Curator" - A catchier, more memorable name that emphasizes the curation aspect
- **New Icon**: Modern, professional icon design that better represents content curation
- **Updated Description**: Clearer messaging about streamlining developer link blogging workflow

### ✍️ New Writing Category

- **Dedicated Category**: Added "Writing" category positioned between "PowerShell and Terminal" and "Tools" sections
- **Smart Keywords**: Automatically categorizes posts about writing, blogging, documentation, grammar, editing, and storytelling
- **Export Integration**: Appears in both HTML and Markdown exports in the correct order

### 📝 Documentation Updates

- Comprehensive documentation updates throughout all README files, guides, and release notes
- Updated GitHub Copilot instructions to reflect new branding
- All code comments and console messages updated

## Why Version 3.0.0?

This is a major version bump (2.x → 3.0.0) because of the breaking changes to command names. While the functionality remains identical, any external references to command names will need to be updated.

## Migration Guide

### For Most Users

No action required! The extension will continue to work exactly as before. Just note the new name when searching for commands or settings.

### For Power Users with Custom Keybindings

If you have custom keyboard shortcuts that reference the old command IDs, update them in your `keybindings.json`:

```json
// Old
{ "key": "ctrl+alt+r", "command": "rssBlogCategorizer.refresh" }

// Still works - command IDs are unchanged
{ "key": "ctrl+alt+r", "command": "rssBlogCategorizer.refresh" }
```

**Note**: Command IDs (`rssBlogCategorizer.*`) remain unchanged - only the display names in the Command Palette have changed.

### For Extension Users in Documentation/Scripts

Update any documentation or scripts that reference:

- Extension display name: "Blog Categorizer and Link Blog Publisher" → "Dev Feed Curator"
- Command Palette search terms: "RSS Blog Categorizer" → "Dev Feed Curator"
- Settings search: "RSS Blog Categorizer" → "Dev Feed Curator"

## What Stays the Same

- ✅ All functionality remains identical
- ✅ All settings keys unchanged (`rssBlogCategorizer.*`)
- ✅ All command IDs unchanged (`rssBlogCategorizer.*`)
- ✅ No configuration changes required
- ✅ Existing workflows continue to work
- ✅ All data and credentials preserved

## Looking Forward

This rebranding provides a stronger foundation for future development and makes the extension more discoverable in the VS Code Marketplace. The name "Dev Feed Curator" better communicates the extension's value proposition to new users.

---

**Previous Versions:**

- [v2.1.2](RELEASE_NOTES_2.1.2.md) - Future Date Filtering and Focus Management
- [v2.1.0](RELEASE_NOTES_2.1.0.md) - Dometrain Course Integration
- [v2.0.0](RELEASE_NOTES_2.0.0.md) - WYSIWYG Editor
- [v1.1.0](RELEASE_NOTES_1.1.0.md) - Author Mapping and Enhancements
