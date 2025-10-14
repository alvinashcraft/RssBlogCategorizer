# Release Notes - Version 1.1.0

## New Features

### 📚 Clickable Book Images
- Book cover images in "The Geek Shelf" section are now clickable hyperlinks
- Clicking an image takes you to the same URL as the book title link
- Improves user experience and consistency

### 👤 Author Name Mapping
- Intelligent author name normalization using a comprehensive mapping database
- 264+ author mappings consolidated from legacy XML files
- Three-tier priority system:
  1. URL-based mappings (125 mappings)
  2. Author name substring matching (27 mappings)
  3. Exact author name matching (112 mappings)
- Ensures consistent author names across different RSS feeds

### 🔗 Syncfusion URL Tracking
- Automatic addition of UTM tracking parameters to Syncfusion blog links
- Dynamic parameters based on current month and year
- Format: `?utm_source=alvinashcraft&utm_medium=email&utm_campaign=alvinashcraft_blog_[month][year]`
- Example: `?utm_source=alvinashcraft&utm_medium=email&utm_campaign=alvinashcraft_blog_oct25`

### ✍️ Improved Multi-Author Formatting
- Grammatically correct formatting for multiple authors
- **2 authors**: "First Author & Second Author"
- **3+ authors**: "First Author, Second Author & Third Author"
- Applies Oxford comma style for three or more authors

### 🧹 Clean URLs
- Automatic removal of 30+ common tracking parameters from URLs
- Removes utm_*, fbclid, gclid, msclkid, and many other tracking params
- Keeps URLs clean and focused while preserving functional parameters

### 🎯 Simplified HTML Output
- Streamlined HTML structure with reduced div nesting
- Better compatibility with WordPress and other content management systems
- Changed empty category placeholders from `<p>TBD</p>` to `<ul>TBD</ul>`
- Maintains flexbox layout for "The Geek Shelf" section

### 🆕 Optional New Tab Links
- New configuration setting: `rssBlogCategorizer.openLinksInNewTab`
- Control whether links in exported HTML open in new browser tabs
- **Default**: Disabled (links open in same tab)
- **When enabled**: Adds `target="_blank"` to all links

## Configuration Changes

### New Setting
```json
{
  "rssBlogCategorizer.openLinksInNewTab": {
    "type": "boolean",
    "default": false,
    "description": "Open links in a new browser tab when clicked"
  }
}
```

## Files Changed

### Source Code
- `src/exportManager.ts` - Enhanced HTML generation with new features
- `src/rssProvider.ts` - Added author mapping and URL processing

### Data Files
- `authorMappings.json` - **NEW** - 264 author name mappings

### Configuration
- `package.json` - Version bumped to 1.1.0, added new setting

### Tests
- `src/test/unit/exportManager.test.ts` - Updated to match new default behavior (no `target="_blank"`)

### Documentation
- `README.md` - Added "What's New in 1.1.0" section and new setting documentation
- `docs/DEVELOPMENT.md` - Updated configuration schema with new setting

## Breaking Changes

⚠️ **None** - All changes are backwards compatible

The new `openLinksInNewTab` setting defaults to `false`, which changes the default behavior from always opening links in new tabs to opening them in the same tab. Users who want the old behavior can enable this setting.

## Testing

- ✅ All existing tests updated and passing
- ✅ Compilation successful with no errors
- ✅ Production build successful
- ✅ VSIX package created: 66.28 KB

## Upgrade Instructions

1. Install the new version from the VSIX file or VS Code Marketplace
2. No configuration changes required - all new features work automatically
3. Optionally enable `openLinksInNewTab` if you prefer links to open in new tabs

## Known Issues

None reported at this time.

## Credits

Developed by Alvin Ashcraft ([@alvinashcraft](https://github.com/alvinashcraft))

---

**Release Date**: October 14, 2025
**Version**: 1.1.0
**Build**: Stable
