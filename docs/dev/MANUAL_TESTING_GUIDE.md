# Manual Testing Guide for Save and Publish Fix

## Prerequisites
1. VS Code with the extension installed in development mode
2. WordPress connection configured in extension settings
3. Test HTML file available (e.g., `test-dew-drop-post.html`)

## Test Steps

### 1. Prepare Test Environment
1. Open VS Code
2. Ensure the extension is loaded (check the Dev Blog Posts view in Explorer)
3. Open the test HTML file: `test-dew-drop-post.html`

### 2. Test the Fixed Save and Publish Flow
1. With the HTML file open, click the edit icon (📝) in the editor toolbar
   - Or use Command Palette: `RSS Blog Categorizer: Open in WYSIWYG Editor`
2. The WYSIWYG editor should open with TinyMCE loaded
3. Make some changes to the content (add text, format something)
4. Click the **"Save & Publish"** button

### 3. Expected Behavior (After Fix)
1. Content is saved to the HTML file
2. A dialog appears: "Content saved! Would you like to publish to WordPress?"
3. Click "Yes"
4. The original HTML file becomes the active editor (you should see it in VS Code)
5. WordPress publishing workflow starts (category selection, tag detection, etc.)
6. After publishing (or cancelling), the WYSIWYG editor closes

### 4. Verify Fix Success
- ✅ **No error message** about "No active editor found"  
- ✅ WordPress publish workflow proceeds normally
- ✅ Editor closes after the complete workflow

### 5. Previous Behavior (Before Fix)
- ❌ "No active editor found. Please open an HTML file to publish." error
- ❌ Publishing workflow would fail
- ❌ User had to manually open HTML file again to publish

## Alternative Test (Save & Close)
1. Open WYSIWYG editor
2. Make changes
3. Click **"Save & Close"** - this should work normally (unchanged behavior)

## Alternative Test (Regular Save)
1. Open WYSIWYG editor  
2. Make changes
3. Click **"Save"** - this should save and keep editor open (unchanged behavior)

## Edge Cases to Test
1. **Cancel Publishing**: Click "No" when asked about publishing - editor should close
2. **File Permissions**: Test with a read-only HTML file (should show error gracefully)
3. **Large HTML Files**: Test with large HTML content to ensure performance
4. **Multiple Files**: Test switching between different HTML files

## Signs of Success
- Smooth workflow from editing to publishing
- No error dialogs about missing active editor
- WordPress publish workflow completes successfully
- Editor behavior feels natural and intuitive