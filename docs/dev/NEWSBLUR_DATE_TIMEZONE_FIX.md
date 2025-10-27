# NewsBlur Date/Timezone Filtering Fix

## Issue

When fetching posts from the NewsBlur API, the date filtering was incorrectly treating UTC timestamps as local time, causing posts to be included or excluded incorrectly. Specifically:

- Posts that were shared more than an hour in the past were being included when they should have been filtered out
- The `shared_date` from NewsBlur was being displayed correctly in the left pane (after timezone conversion)
- But the date comparison logic was treating the same date as local time instead of UTC

## Root Cause

NewsBlur API returns `shared_date` values in UTC format like:
```
"2025-10-27 06:09:00.237000"
```

However, this string lacks a timezone indicator (no 'Z' suffix). When JavaScript's `Date` constructor parses such a string, it interprets it as **local time**, not UTC.

### The Problem Chain

1. NewsBlur returns: `shared_date = "2025-10-27 06:09:00.237000"` (UTC)
2. Code stores it as-is in `post.pubDate`
3. In `filterPostsByDate()`, code creates: `new Date(post.pubDate)`
4. JavaScript interprets this as: "2025-10-27 06:09:00" **in local timezone** (e.g., EDT)
5. For a user in EDT (UTC-4), this becomes 10:09:00 UTC internally
6. Comparison logic then incorrectly calculates time differences

## Solution

Modified `parseNewsBlurApiResponse()` in `src/rssProvider.ts` to append 'Z' to NewsBlur date strings that don't already have timezone information:

```typescript
if (rawDate.includes('Z') || rawDate.includes('+') || rawDate.includes('T')) {
    // Already has timezone info or is proper ISO format
    pubDate = rawDate;
} else {
    // Add 'Z' to indicate UTC timezone
    pubDate = rawDate + 'Z';
}
```

This ensures that:
1. NewsBlur UTC strings are properly marked as UTC with the 'Z' suffix
2. JavaScript correctly interprets them as UTC times
3. Date comparisons in `filterPostsByDate()` work correctly
4. Display in the UI continues to work (it was already handling this correctly)

## Files Modified

- `src/rssProvider.ts` - Updated `parseNewsBlurApiResponse()` method (lines 619-628)

## Testing

To verify the fix:
1. Enable NewsBlur API integration with your credentials
2. Set the buffer time to 0 minutes (or disable it)
3. Fetch posts from NewsBlur
4. Verify that only posts shared after the last Dew Drop post are included
5. Check the console logs to confirm date comparisons are working correctly

## Related Issues

This fix ensures that the date filtering respects the configured buffer settings and correctly filters based on the last Dew Drop publication date.

## Date: October 27, 2025
