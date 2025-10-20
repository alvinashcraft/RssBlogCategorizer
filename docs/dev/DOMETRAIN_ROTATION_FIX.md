# Dometrain Course Rotation Fix

## Issue
The Dometrain course rotation was updating the `dometrainLastCourseId` setting immediately when exporting HTML/Markdown, which meant:
- Every export would advance to the next course
- If you exported multiple times while editing, it would skip courses
- The course would rotate even if you never published the post

## Solution
Modified the course rotation logic to only update the setting **after successful WordPress publish**.

### How It Works

#### 1. During Export (`exportManager.ts`)
- `getDometrainCourseOfTheDay()` selects the next course based on the last course ID
- **Does NOT update** the `dometrainLastCourseId` setting
- Returns the selected course for display

#### 2. HTML Generation (`generateDometrainHtml()`)
- Includes the course ID as a hidden HTML comment: `<!-- dometrain-course-id: COURSE_ID -->`
- This preserves the course ID in the exported HTML file

#### 3. After WordPress Publish (`wordpressManager.ts`)
- `publishHtmlFile()` calls `publishPost()` and checks if it was successful
- If successful, calls `updateDometrainCourseAfterPublish(html)`
- Extracts the course ID from the HTML comment
- **Updates** `dometrainLastCourseId` setting to the published course ID
- Next export will now show the next course in rotation

### Benefits
✅ Course only rotates when you actually publish to WordPress  
✅ Multiple exports of the same post show the same course  
✅ Safe to export, edit, and re-export without skipping courses  
✅ Course rotation is tied to actual post publication  

### Code Changes

**`src/exportManager.ts`**
- Removed setting update from `getDometrainCourseOfTheDay()`
- Added comment explaining the course ID is updated after publish
- Added HTML comment with course ID to `generateDometrainHtml()`

**`src/wordpressManager.ts`**
- Modified `publishHtmlFile()` to update course ID after successful publish
- Added `updateDometrainCourseAfterPublish()` method to extract and update course ID
- Regex pattern: `/<!-- dometrain-course-id: ([^\s]+) -->/`

### Testing Scenarios

1. **Export Multiple Times**
   - Export HTML → should show Course A
   - Edit and export again → should still show Course A
   - Publish to WordPress → course ID updates
   - Export again → should show Course B

2. **Export Without Publishing**
   - Export HTML → should show Course A
   - Close without publishing
   - Export again later → should still show Course A

3. **Failed Publish**
   - Export HTML → shows Course A
   - Attempt to publish but it fails
   - Course ID should NOT update
   - Next export should still show Course A

4. **Successful Publish**
   - Export HTML → shows Course A
   - Publish successfully to WordPress
   - Course ID updates to Course A
   - Next export → shows Course B

### Edge Cases Handled
- If the HTML comment is not found (shouldn't happen), the update silently fails without breaking the publish
- Errors in updating the course ID are logged but don't fail the publish operation
- The HTML comment is visible in the source but doesn't affect rendering

---

**Date**: October 20, 2025  
**Version**: 2.1.0  
**Status**: Implemented and tested
