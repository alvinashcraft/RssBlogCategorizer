# Changelog

All notable changes to the "Dev Feed Curator" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [3.0.0] - 2025

### Changed

- **Rebranded** to "Dev Feed Curator" with a modern icon and updated messaging
- All command display names updated from "RSS Blog Categorizer" to "Dev Feed Curator"
- Command IDs (`rssBlogCategorizer.*`) and settings keys remain unchanged

### Added

- New **Writing** category for content writing, blogging, grammar, and editing posts

## [2.1.2]

### Added

- **Future date filtering** for RSS posts to prevent duplicates from future-dated items
- **Enhanced TinyMCE editor focus management** with Alt+Tab recovery and cursor position preservation
- Screenshots added to README for VS Code Marketplace presentation

### Removed

- Deprecated TinyMCE spellcheck configuration (browser spellcheck still works)

## [2.1.0]

### Added

- **Dometrain Course section** with daily course rotation in exports
- Smart course filtering, affiliate tracking, and cross-device sync via VS Code Settings Sync
- New settings: `enableDometrainSection` and `dometrainLastCourseId`

## [2.0.0]

### Added

- **WYSIWYG Editor** powered by TinyMCE for visually editing posts before publishing
- Rich formatting toolbar with bold, italic, colors, headings, links, images, and more
- Save, Save & Publish, and Cancel actions with keyboard shortcuts
- VS Code theme integration for the editor

## [1.1.0]

### Added

- **Clickable book images** in "The Geek Shelf" section
- **Author name mapping** with 264+ author mappings and three-tier priority system
- **Syncfusion URL tracking** with automatic UTM parameter insertion
- **Improved multi-author formatting** with Oxford comma style
- **Clean URLs** with automatic removal of 30+ common tracking parameters
- **Optional new tab links** setting (`openLinksInNewTab`)

### Changed

- Simplified HTML output with reduced div nesting for better WordPress compatibility

## [1.0.0]

### Added

- Initial release
- RSS/Atom feed fetching and parsing
- Smart post categorization by technology
- Tree view integration in VS Code Explorer sidebar
- HTML and Markdown export
- WordPress publishing via REST API
- NewsBlur API integration
- Configurable settings for feeds, refresh intervals, and date filtering
- Book recommendations ("The Geek Shelf") section
