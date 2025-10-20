# Release Notes - Version 2.1.0

## 🎓 New Features

### Dometrain Course Section
Version 2.1.0 introduces an optional "Dometrain Course" section that highlights a different video training course from Dometrain every day in your exported blog posts.

#### Key Features
- **Daily Course Rotation**: Automatically cycles through Dometrain courses with each export
- **Smart Filtering**: Excludes courses with "Design Pattern" in the title (configurable via code)
- **Affiliate Tracking**: Automatically appends `?ref=alvin-ashcraft&promo=morning-dew` to course URLs
- **Cross-Device Sync**: Remembers the last course shown across computers (when VS Code Settings Sync is enabled)
- **Consistent Layout**: Matches the styling of "The Geek Shelf" section with thumbnail, title, subtitle, and author information

#### Section Placement
The Dometrain Course section appears between "Screencasts and Videos" and "Podcasts" categories in both HTML and Markdown exports.

#### Configuration Settings

##### Enable Dometrain Section
```json
{
  "rssBlogCategorizer.enableDometrainSection": {
    "type": "boolean",
    "default": false,
    "description": "Enable Dometrain Course section in exports"
  }
}
```
**Default**: Disabled (opt-in feature)

##### Last Course ID Tracking
```json
{
  "rssBlogCategorizer.dometrainLastCourseId": {
    "type": "string",
    "default": "",
    "description": "Tracks last shown course for rotation"
  }
}
```
This setting is automatically managed by the extension and syncs across devices when VS Code Settings Sync is enabled.

#### How It Works
1. When enabled, the extension fetches available courses from `https://dometrain.com/courses.json`
2. Courses with "Design Pattern" in the title are filtered out
3. The extension selects the next course after the last one shown
4. The course ID is saved to settings for persistence
5. Each new export advances to the next course in the rotation

#### Section Content
- **Thumbnail**: Course cover image (100px width)
- **Title**: Linked course title with tracking parameters
- **Subtitle**: Course subtitle (if available)
- **Authors**: Course author names (comma-separated)
- **Referral indicator**: "Referral Link" text to indicate affiliate tracking

### Browser Spellcheck in WYSIWYG Editor
Added native browser spellcheck support to the TinyMCE WYSIWYG editor.

- **Red squiggles**: Misspelled words now show red underlines
- **Right-click corrections**: Access spelling suggestions via context menu
- **System language**: Uses your browser/OS configured language
- **Always enabled**: No configuration needed, works automatically

## 🔧 Technical Implementation

### New TypeScript Interfaces
```typescript
interface DometrainCourse {
    course_id: number;
    course_title: string;
    course_subtitle?: string;
    thumbnail_url: string;
    course_url: string;
    author_names: string[];
    duration?: string;
}
```

**Note**: The interface matches the Dometrain API response structure directly for optimal performance (no transformation overhead). The API returns an array of courses directly, not wrapped in a response object.

### New Methods in ExportManager
- `fetchDometrainCourses()`: Fetches course data from Dometrain API
- `getDometrainCourseOfTheDay()`: Selects and tracks the current course
- `generateDometrainHtml()`: Creates HTML markup for the section
- `generateDometrainMarkdown()`: Creates Markdown markup for the section

### Export Generation Updates
- Changed from `forEach` to `for...of` loops to support async/await
- Dometrain section dynamically inserted after "Screencasts and Videos" category
- Works in both `generateHtmlContent()` and `generateMarkdownContent()` methods

## 📝 Files Changed

### Configuration
- `package.json` - Added two new settings for Dometrain feature

### Source Code
- `src/exportManager.ts` - Added Dometrain interfaces, methods, and integration logic
- `webview/editor.html` - Enabled browser spellcheck in TinyMCE configuration

### Documentation
- `release-notes/RELEASE_NOTES_2.1.0.md` - This file

## 🚀 Usage Instructions

### Enabling Dometrain Courses
1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Dometrain"
3. Check the "Enable Dometrain Section" checkbox
4. Export your blog posts (HTML or Markdown)
5. The Dometrain Course section will appear in your export

### Using the Spellcheck
1. Open any HTML file in the WYSIWYG editor
2. Type some text with misspelled words
3. Red underlines will appear automatically
4. Right-click on underlined words to see corrections

## ⚠️ Breaking Changes

**None** - All changes are backwards compatible and opt-in.

## 📦 Upgrade Instructions

1. Install version 2.1.0 from the VSIX file or VS Code Marketplace
2. No configuration changes required - all features work out of the box
3. Optionally enable the Dometrain section if desired

## 🧪 Testing Checklist

- [x] Dometrain section disabled by default
- [x] Enabling setting shows section in HTML exports
- [x] Enabling setting shows section in Markdown exports
- [x] Courses cycle through on each export
- [x] Course ID persists in settings
- [x] Design Pattern courses are filtered out
- [x] Tracking parameters appended to URLs
- [x] Spellcheck shows red underlines in editor
- [x] Right-click suggestions work
- [x] Compilation successful with no errors

## 🐛 Known Issues

None reported at this time.

## 🙏 Credits

Developed by Alvin Ashcraft ([@alvinashcraft](https://github.com/alvinashcraft))

Special thanks to [Dometrain](https://dometrain.com) for providing the course API.

---

**Release Date**: October 20, 2025  
**Version**: 2.1.0  
**Build**: Stable
