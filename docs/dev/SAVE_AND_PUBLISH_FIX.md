# Save and Publish Button Fix

## Issue Description
When clicking the "Save and Publish" button in the WYSIWYG editor, the following sequence of events occurred:

1. Content was saved to the HTML file
2. Editor webview panel was disposed/closed 
3. WordPress publish command was executed
4. VS Code showed error: "No active editor found. Please open an HTML file to publish."

## Root Cause
The `EditorManager.saveAndPublishContent()` method was closing the webview panel before executing the publish command. The WordPress publish command (`rssBlogCategorizer.publishToWordpress`) requires an active text editor to function, but the webview panel disposal removed the active editor context.

## Solution
Modified the editor workflow in `src/editorManager.ts`:

### Before (Problematic Flow)
```typescript
case 'saveAndPublish':
    await this.saveContent(message.content, false, true);
    await this.saveAndPublishContent(message.content);
    // Panel disposed here immediately
    this.panel?.dispose();
    break;
```

### After (Fixed Flow)
```typescript
case 'saveAndPublish':
    await this.saveContent(message.content, false, true);
    await this.saveAndPublishContent(message.content);
    // Panel disposal moved to saveAndPublishContent method
    break;
```

### Key Changes in `saveAndPublishContent()`:

1. **Ensure Original Document is Active**: Before calling the publish command, explicitly open and show the original HTML document as the active editor
2. **Delayed Panel Disposal**: Only dispose the webview panel after the complete publish workflow (or user cancellation)
3. **Error Handling**: Added try-catch for document opening errors

```typescript
private async saveAndPublishContent(content: string): Promise<void> {
    // Save content first
    await this.saveContent(content);
    
    // Ask user about publishing
    const result = await vscode.window.showInformationMessage(
        'Content saved! Would you like to publish to WordPress?',
        'Yes', 'No'
    );
    
    if (result === 'Yes' && this.originalDocumentUri) {
        try {
            // Ensure the original document is open and active
            const document = await vscode.workspace.openTextDocument(this.originalDocumentUri);
            await vscode.window.showTextDocument(document);
            
            // Execute publish command with active editor available
            await vscode.commands.executeCommand('rssBlogCategorizer.publishToWordpress');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open document for publishing: ${error}`);
        }
    }
    
    // Clean up after workflow completion
    if (this.resolvePromise) {
        this.resolvePromise(content);
        this.resolvePromise = undefined;
    }
    this.panel?.dispose();
}
```

## Benefits
- Fixes the "No active editor found" error
- Maintains proper editor context throughout the publish workflow
- Provides better error handling for edge cases
- Preserves the user experience of the Save & Publish button

## Testing
The fix ensures that:
1. Content is saved to the HTML file
2. Original HTML document becomes the active editor
3. WordPress publish command executes successfully with active editor context
4. Editor panel closes only after the complete workflow

## Files Modified
- `src/editorManager.ts` - Updated `saveAndPublishContent()` method and message handling

## Version
Fixed in development branch: `alvinashcraft/main-publish-fix-and-tweaks`