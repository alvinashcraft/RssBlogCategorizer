# Categories Configuration

This file contains the categories and keywords used to automatically categorize RSS feed posts.

## Structure

```json
{
  "categories": {
    "Category Name": [
      "keyword1",
      "keyword2",
      "phrase with spaces"
    ]
  },
  "defaultCategory": "General",
  "wholeWordKeywords": [
    "ai",
    "ios",
    "api"
  ]
}
```

## How It Works

- Each category has a list of keywords and phrases
- When categorizing a post, the system searches **only the title** (case-insensitive) for better accuracy
- The first matching category is assigned to the post (based on JSON order priority)
- If no keywords match, the post gets assigned to the `defaultCategory`
- **Note**: Only titles are searched to avoid false matches from keywords in post descriptions

### Keyword Matching Types

- **Substring matching (default)**: Keywords can appear anywhere within words (e.g., "script" matches "JavaScript")
- **Whole word matching**: Keywords listed in `wholeWordKeywords` only match as complete words
  - Example: "ai" in `wholeWordKeywords` matches "AI Revolution" but not "Available Now"
  - Useful for short keywords that commonly appear within other words
  - Uses word boundaries to ensure precise matching

## Adding New Categories

1. Open `categories.json` (in the extension root directory)
2. Add a new category with relevant keywords:

   ```json
   "New Category": [
     "keyword1",
     "keyword2",
     "another keyword"
   ]
   ```

3. Save the file
4. Refresh the RSS feed to apply changes

## Modifying Existing Categories

- Add new keywords to existing arrays
- Remove keywords you don't want
- Rename categories by changing the key names
- Keywords are matched using case-insensitive substring matching

## Date Filtering

The extension filters posts by publication date using **UTC timezone** with both past and future boundaries:

**Date Range:**

- **Minimum**: Uses the date of the latest "Dew Drop" post from alvinashcraft.com (smart default)
- **Maximum**: Current time + 30 minutes (prevents future-dated posts from appearing prematurely)
- **Fallback**: If the blog date can't be fetched, uses posts from the last 24 hours (UTC)
- **Custom filter**: Set `minimumDateTime` in VS Code settings using UTC format

**Why Future Filtering?**

- Prevents duplicate posts from RSS feeds with inconsistent timestamps
- Ensures posts with future dates appear in tomorrow's collection instead of today's
- Handles timezone discrepancies and sharing delays in RSS feeds

**Format examples:**

- `2025-01-01T00:00:00Z` (midnight UTC on Jan 1, 2025)
- `2025-09-27T12:00:00.000Z` (noon UTC on Sep 27, 2025)

**Important**: All date comparisons use UTC to ensure consistency across timezones

### NewsBlur Date Filtering

When using NewsBlur API integration, the extension prioritizes the **shared date** for filtering:

- **Primary**: Uses `shared_date` (when you shared the item in NewsBlur)
- **Fallback**: Uses `story_date` (original publication date) if shared_date is unavailable
- **Benefit**: Allows inclusion of older content based on when you curated it, not when it was originally published

## Whole Word Keywords

The optional `wholeWordKeywords` array contains keywords that should only match as complete words:

- **Performance**: Regex patterns are cached for efficiency during categorization
- **Use cases**: Short keywords like "ai", "js", "go", "c" that often appear within other words
- **Example configuration**:

  ```json
  "wholeWordKeywords": [
    "ai",
    "api", 
    "js",
    "go"
  ]
  ```

## Tips

- **Focus on title keywords**: Since only titles are searched, choose keywords that commonly appear in post titles
- **Use specific keywords** to avoid false matches
- **Include common variations** of terms (e.g., "javascript", "js")  
- **Consider abbreviations** and alternative names that appear in titles
- **Avoid overly generic terms** that might appear in many different types of posts
- **Use whole word matching** for short keywords that commonly appear within other words
- **Test your changes** by refreshing the feed and checking categorization results
