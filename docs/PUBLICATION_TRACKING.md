# Publication Tracking

This document describes the publication tracking metadata system that prevents duplicate WordPress posts and tracks publication status.

## Overview

Starting with version 2.2.0, the RSS Blog Categorizer includes a metadata tracking system that:

1. **Adds metadata to exports**: Both HTML and Markdown exports now include publication metadata comments
2. **Tracks publication status**: Metadata tracks whether content has been published and the WordPress post ID
3. **Prevents duplicates**: WordPress publishing checks for existing publication metadata and warns users
4. **Updates after publishing**: Successful WordPress publications automatically update the metadata

## Metadata Format

Metadata is stored as HTML comments in both HTML and Markdown exports:

```html
<!-- PUBLICATION_METADATA: {"contentId":"dewdrop-2024-01-15-abc123ef","status":"draft","lastModified":"2024-01-15T10:30:00.000Z"} -->
```

### Metadata Fields

- **contentId**: Unique identifier based on date and content hash (e.g., `dewdrop-2024-01-15-abc123ef`)
- **status**: Publication status (`"draft"` or `"published"`)
- **lastModified**: ISO date string of last metadata update
- **publishedDate**: ISO date string when content was published (only present after publishing)
- **wordpressPostId**: WordPress post ID (only present after successful publishing)

## Workflow

### Export Process

1. When exporting HTML or Markdown, the system generates a unique content ID based on:
   - Current date (YYYY-MM-DD format)
   - MD5 hash of post titles, links, and authors (first 8 characters)

2. Initial metadata is added with `status: "draft"`

### Publishing Process

1. Before publishing to WordPress, the system checks if the content has already been published
2. If published metadata is found, the user is prompted to confirm they want to continue
3. After successful WordPress publishing (with `status: "publish"`), the metadata is updated with:
   - `status: "published"`
   - `wordpressPostId: <post_id>`
   - `publishedDate: <current_timestamp>`

### Duplicate Prevention

The system prevents accidental duplicate posts by:

1. **Checking publication status**: `isContentPublished()` method checks for published metadata
2. **User confirmation**: If published metadata is found, user must explicitly confirm to continue
3. **Automatic updates**: Metadata is automatically updated after successful publishing

## File Location

Metadata is stored directly in the exported HTML/Markdown files:

- **HTML files**: Metadata comment is placed in the `<body>` section after the opening tag
- **Markdown files**: Metadata comment is placed at the very beginning of the file

## API Reference

### ExportManager Methods

#### `parsePublicationMetadata(content: string): PublicationMetadata | null`

Extracts publication metadata from content string.

#### `isContentPublished(content: string): boolean`

Returns true if content has been published to WordPress.

#### `updatePublicationMetadata(content: string, metadata: Partial<PublicationMetadata>): string`

Updates metadata in content and returns updated content.

#### `markAsPublished(filePath: string, wordpressPostId: number): Promise<void>`

Marks a file as published with the given WordPress post ID.

#### `getPublicationMetadata(filePath: string): Promise<PublicationMetadata | null>`

Reads and returns publication metadata from a file.

### PublicationMetadata Interface

```typescript
interface PublicationMetadata {
    contentId: string;
    publishedDate?: string;
    wordpressPostId?: number;
    status: 'draft' | 'published';
    lastModified: string;
}
```

## Migration

Existing exported files without metadata will not have publication tracking until they are re-exported. The system gracefully handles files without metadata and will not prevent publishing of legacy files.

## Error Handling

The system includes robust error handling:

- **Metadata parsing errors**: Failed JSON parsing is logged but doesn't prevent publishing
- **File update errors**: Metadata update failures are logged but don't fail the publish operation
- **Missing metadata**: Files without metadata are treated as unpublished and can be published normally

## Future Enhancements

### Planned for Version 2.5.0

- **Edit Published Posts**: Leverage the stored WordPress post ID to enable updating already published posts instead of creating duplicates
- **Post Synchronization**: Allow syncing local changes back to existing WordPress posts
- **Publication History**: Track multiple publications and revisions of the same content

## Best Practices

1. **Re-export after major changes**: If you significantly modify a Dew Drop post, consider re-exporting to get a new content ID
2. **Check metadata before publishing**: Review the publication status in exported files before WordPress publishing
3. **Keep exported files**: Don't delete exported HTML/Markdown files as they contain publication tracking metadata
4. **Version control**: Consider committing exported files to track publication history
