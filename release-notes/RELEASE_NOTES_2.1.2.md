# Release Notes - Version 2.1.2

*Released: [Release Date]*

## 🚀 What's New

### Future Date Filtering for RSS Posts

Enhanced RSS feed processing with intelligent future date filtering to prevent duplicate posts.

- **Smart Date Filtering**: Posts with future publication dates (beyond current time + 30 minutes) are now excluded
- **Buffer Zone**: 30-minute buffer prevents issues with slight timezone differences and server clock variations  
- **Tomorrow's Posts**: Future-dated posts will be automatically included in tomorrow's feed refresh
- **Duplicate Prevention**: Eliminates duplicate posts appearing across multiple days

### Enhanced TinyMCE Editor Focus Management

Improved focus restoration in the WYSIWYG editor for better user experience.

- **Alt+Tab Focus Recovery**: Editor automatically regains focus when returning to VS Code after Alt+Tab
- **Cursor Position Preservation**: Maintains exact cursor position when focus is restored
- **Multi-layered Detection**: Uses window focus events, visibility API, and periodic checks for reliable focus restoration
- **VS Code Integration**: Works seamlessly with VS Code's panel system and webview lifecycle

### Marketplace Enhancement

Added screenshots to README for better VS Code Marketplace presentation.

- **Visual Documentation**: Added screenshots showing the Dev Blog Posts panel and WYSIWYG editor
- **Marketplace Visibility**: Improved extension discoverability with visual examples
- **User Experience**: Helps users understand the extension's interface before installation

## 🔄 Changes

### Removed TinyMCE Spellcheck Configuration

Removed deprecated spellcheck-related code from the TinyMCE editor configuration.

- **Background**: TinyMCE deprecated the free spellcheck plugin in v5.4 and removed it in v6.0
- **Impact**: The extension now relies on standard browser spellcheck functionality
- **Code Cleanup**: Removed non-functional spellcheck configuration options and related CSS
- **Documentation Update**: Updated README to remove mentions of red underline spellcheck features

**Note**: Modern browsers provide built-in spellcheck functionality that works in contenteditable areas, so this change doesn't impact the user experience significantly.

## 🔧 Technical Implementation

### Enhanced Date Filtering Logic

```typescript
// Added maximum date boundary to prevent future posts
const maximumDateTime = new Date(Date.now() + (30 * 60 * 1000)); // Current time + 30 minutes

const filteredPosts = posts.filter(post => {
    const postDate = new Date(post.date);
    return postDate >= minimumDateTime && postDate <= maximumDateTime;
});
```

### Focus Management Implementation

- **Bookmark-based Cursor Tracking**: Uses TinyMCE's bookmark system to preserve exact cursor position
- **Multi-event Handling**: Responds to window blur/focus, visibility changes, and periodic checks
- **Graceful Degradation**: Falls back to end-of-content positioning if bookmark restoration fails

### File Changes

- `src/rssProvider.ts` - Enhanced `filterPostsByDate()` with future date filtering
- `webview/editor.html` - Comprehensive focus management and spellcheck cleanup
- `src/editorManager.ts` - Added panel visibility focus restoration
- `README.md` - Added screenshots section and removed spellcheck references
- `src/test/basic/basic.test.ts` - Added future date filtering tests
- `src/test/unit/rssProvider.test.ts` - Enhanced date filtering test coverage

## 📝 Documentation Updates

### Development Guidelines

- Created `.github/copilot-instructions.md` with comprehensive development guidelines
- Added testing protocols and documentation requirements
- Established version control and publishing guidelines

### Focus Restoration Documentation

- Added detailed documentation of the multi-layered focus detection system
- Documented cursor position preservation using TinyMCE bookmarks
- Explained Alt+Tab scenario handling and VS Code integration

## ✅ Testing

### Enhanced Test Coverage

- **Future Date Tests**: Validates that posts dated more than 30 minutes in the future are excluded
- **Edge Case Testing**: Tests timezone boundaries and server clock variations
- **Focus Management Tests**: Manual testing procedures documented for focus restoration

### Smoke Testing Checklist

- [x] Future-dated posts are excluded from today's results
- [x] 30-minute buffer allows near-future posts
- [x] Editor regains focus after Alt+Tab with correct cursor position
- [x] All buttons and editor functionality work correctly
- [x] Screenshots display correctly in README

## 🔗 Related Issues

This release addresses several user experience improvements:

- Duplicate post prevention through intelligent date filtering
- Better editor focus management for Alt+Tab scenarios  
- Improved marketplace presentation with visual documentation
- Code cleanup removing deprecated spellcheck functionality

---

*For complete version history, see the [release-notes](../release-notes/) directory.*
