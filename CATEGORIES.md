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
  "defaultCategory": "General"
}
```

## How It Works

- Each category has a list of keywords and phrases
- When categorizing a post, the system searches **only the title** (case-insensitive) for better accuracy
- The first matching category is assigned to the post (based on JSON order priority)
- If no keywords match, the post gets assigned to the `defaultCategory`
- **Note**: Only titles are searched to avoid false matches from keywords in post descriptions

## Adding New Categories

1. Open `categories.json`
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

The extension filters posts by publication date using **UTC timezone**:

- **Smart default**: Automatically uses the date of the latest "Dew Drop" post from alvinashcraft.com
- **Fallback**: If the blog date can't be fetched, uses posts from the last 24 hours (UTC)
- **Custom filter**: Set `minimumDateTime` in VS Code settings using UTC format
- **Format examples**:
  - `2025-01-01T00:00:00Z` (midnight UTC on Jan 1, 2025)
  - `2025-09-27T12:00:00.000Z` (noon UTC on Sep 27, 2025)
- **Important**: All date comparisons use UTC to ensure consistency across timezones

## Tips

- **Focus on title keywords**: Since only titles are searched, choose keywords that commonly appear in post titles
- Use specific keywords to avoid false matches
- Include common variations of terms (e.g., "javascript", "js")
- Consider abbreviations and alternative names that appear in titles
- Avoid overly generic terms that might appear in many different types of posts
- Test your changes by refreshing the feed and checking categorization results
