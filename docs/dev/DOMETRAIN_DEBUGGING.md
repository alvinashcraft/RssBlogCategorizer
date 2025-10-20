# Dometrain Section Debugging Guide

## Issue Reported
The Dometrain section was not appearing in HTML exports even though:
- The setting was enabled
- A last course ID (3232238) was set

## Fixes Applied

### 1. Course ID Type Handling
**Problem**: Course IDs might be returned as numbers from the API but stored as strings in settings.

**Fix**: Added explicit string conversion for ID comparison:
```typescript
const lastCourseId = String(config.get<string>('dometrainLastCourseId') || '');
const lastIndex = filteredCourses.findIndex(c => String(c.id) === lastCourseId);
```

### 2. Enhanced Logging
Added comprehensive console logging throughout the Dometrain flow to help diagnose issues:

#### In `getDometrainCourseOfTheDay()`:
- ✅ Logs whether the setting is enabled
- ✅ Logs total courses fetched
- ✅ Logs filtered course count
- ✅ Logs the last course ID from settings
- ✅ Logs the index where last course was found
- ✅ Logs the next index calculation
- ✅ Logs the selected course details

#### In `generateDometrainHtml()`:
- ✅ Logs when method is called
- ✅ Logs if no course was returned
- ✅ Logs the course title being generated

#### In `generateHtmlContent()`:
- ✅ Logs each category being processed
- ✅ Logs when "Screencasts and Videos" is found
- ✅ Logs the length of generated Dometrain HTML

## How to Debug

### Step 1: Open Developer Tools
1. In VS Code, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Developer: Toggle Developer Tools"
3. Click to open the Console tab

### Step 2: Check Settings
Verify in VS Code Settings (or settings.json):
```json
{
  "rssBlogCategorizer.enableDometrainSection": true,
  "rssBlogCategorizer.dometrainLastCourseId": "3232238"
}
```

### Step 3: Trigger Export
1. Run "Export as HTML" command
2. Watch the Console for log messages

### Step 4: Analyze Logs

Look for these key messages:

#### ✅ Good Flow:
```
Dometrain section enabled: true
Fetching Dometrain courses...
Fetched 150 total courses
After filtering: 142 courses (removed 8 Design Pattern courses)
Last course ID from settings: "3232238"
Found last course at index: 45
Next index will be: 46 (cycling through 142 courses)
Selected Dometrain course at index 46: "Course Name" (ID: 1234567)
Processing category: "Screencasts and Videos"
Found "Screencasts and Videos" category, generating Dometrain section...
generateDometrainHtml called
Generating Dometrain HTML for course: Course Name
Dometrain HTML length: 450
```

#### ❌ Problem Scenarios:

**Setting Disabled:**
```
Dometrain section enabled: false
Dometrain section is disabled in settings
```

**API Fetch Failed:**
```
Failed to fetch Dometrain courses: HTTP 404
No Dometrain courses found
```

**Course ID Not Found:**
```
Last course ID from settings: "3232238"
Found last course at index: -1
Last course ID "3232238" not found in filtered list, starting from beginning
```

**Wrong Category Name:**
```
Processing category: "Top Links"
Processing category: "Web Development"
... (never finds "Screencasts and Videos")
```

## Testing Scenarios

### Test 1: First Time Use (No Last Course ID)
- **Settings**: `enableDometrainSection: true`, `dometrainLastCourseId: ""`
- **Expected**: Should select first course in filtered list (index 0)

### Test 2: With Last Course ID
- **Settings**: `enableDometrainSection: true`, `dometrainLastCourseId: "3232238"`
- **Expected**: Should find course 3232238 in array and select the next one

### Test 3: Last Course ID Not Found
- **Settings**: `enableDometrainSection: true`, `dometrainLastCourseId: "invalid123"`
- **Expected**: Should start from beginning (index 0) with warning log

### Test 4: Last Course at End of Array
- **Settings**: Last course is the final course in filtered list
- **Expected**: Should wrap around to index 0 (first course)

## Course Rotation Logic

The rotation follows **JSON array order**, NOT numerical ID order:

```typescript
// If courses.json has:
courses: [
  { id: "100", title: "Course A" },  // index 0
  { id: "50", title: "Course B" },   // index 1
  { id: "200", title: "Course C" },  // index 2
]

// And lastCourseId = "50" (Course B at index 1)
// Next course will be: Course C at index 2
// NOT sorted by ID number!
```

## Troubleshooting

### Issue: Section Not Appearing

**Check 1: Is the setting enabled?**
```
Look for: "Dometrain section enabled: true"
```

**Check 2: Are courses being fetched?**
```
Look for: "Successfully fetched X Dometrain courses"
```

**Check 3: Are courses being filtered out?**
```
Look for: "After filtering: X courses"
Should be > 0
```

**Check 4: Is category found?**
```
Look for: 'Found "Screencasts and Videos" category'
```

**Check 5: Is HTML being generated?**
```
Look for: "Dometrain HTML length: X"
Should be > 0
```

### Issue: Wrong Course Selected

**Check the logs:**
```
Last course ID from settings: "YOUR_ID"
Found last course at index: X
Next index will be: Y
```

If index is -1, the course ID wasn't found in the filtered list.

### Issue: Same Course Appears Repeatedly

This is **expected behavior**! The course ID only updates after successful WordPress publish, not after export. Export multiple times = same course.

## File Locations

- Main logic: `src/exportManager.ts`
- Methods: `getDometrainCourseOfTheDay()`, `generateDometrainHtml()`
- Update logic: `src/wordpressManager.ts` → `updateDometrainCourseAfterPublish()`

---

**Updated**: October 20, 2025  
**Version**: 2.1.0  
**Status**: Enhanced with debug logging
