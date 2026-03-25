# Changelog

All notable changes to the "Dev Feed Curator" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [3.10.1] - 2026-03-25

### Fixed

- Fixed approved submissions not appearing after feed refresh due to API response field-casing mismatch

### Changed

- Approved submissions are now marked as processed only after a successful WordPress publish, not during feed refresh — abandoned drafts no longer consume submissions

## [3.10.0] - 2026-03-24

### Added

- **Expanded localization support** - Added Dutch (Nederlands) and Swedish (Svenska) locale files
- Extension now supports 8 languages total: English, Spanish, German, French, Italian, Portuguese, Dutch, and Swedish

### Changed

- Updated packaging workflow to use a pinned local VSCE toolchain via `@vscode/vsce`
- Added `npm run vsce:package` and `npm run vsce:publish` scripts for consistent packaging and publishing
- Updated `test:basic` script to run compiled tests with `--no-config` to avoid duplicate test discovery and Node typeless-module warnings
- Updated localization section in README to reflect newly added locales

## [3.9.1] - 2026-03-24

### Added

- Added secure submissions API key setup command (`rssBlogCategorizer.setSubmissionApiKey`)
- Added user-facing warnings for missing submissions API configuration with action to set API key
- Added informational submissions count notification after fetching approved links

### Changed

- Moved submissions API key storage from settings to VS Code SecretStorage
- Removed insecure plain-text submissions API key setting from extension configuration
- Simplified submissions API notification dismissal behavior
- Updated documentation and localization files for secure key setup and warning flows

### Fixed

- Added submissions API base URL validation with HTTPS enforcement and clearer warning messages
- Improved submissions source handling for invalid or missing configuration scenarios
- Updated submissions fetch to request the full approved queue without extension-side date filtering

## [3.9.0] - 2026-03-23

### Added

- Added a secondary source pipeline for approved submissions API links
- Added submissions API integration for retrieving approved links and ingesting them as categorized posts
- Added automatic submission status updates to mark consumed items as `processed`
- Added new submissions source settings to enable the feature and configure the submissions API base URL

### Changed

- Extended feed aggregation workflow to merge primary RSS/NewsBlur results with approved submissions
- Updated README and localization resources for submissions source configuration and behavior

## [3.8.0] - 2025-03-01

### Added

- **Expanded localization support** - Added German (Deutsch), French (Français), Italian (Italiano), and Portuguese (Português)
- Extension now supports 6 languages total: English, Spanish, German, French, Italian, and Portuguese
- All user-facing strings translated including commands, settings, messages, and editor UI
- Comprehensive localization documentation in `docs/LOCALIZATION.md`
- Localization testing guide in `docs/LOCALIZATION_TESTING.md`

### Changed

- Updated README to reflect all supported languages
- Enhanced localization infrastructure with consistent placeholder handling across all languages

## [3.7.0] - 2025-02-25

### Added

- Full extension localization support for **English** and **Spanish**
- Localized package contribution metadata via `package.nls.json` and `package.nls.es.json`
- Runtime string localization bundles via `l10n/bundle.l10n.json` and `l10n/bundle.l10n.es.json`

### Changed

- Localized user-facing strings across command flows, notifications, prompts, and tree view labels
- Localized WYSIWYG editor controls for both TinyMCE HTML and EasyMDE Markdown webviews
- Updated build pipeline to package localization resources from the `l10n` folder

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
