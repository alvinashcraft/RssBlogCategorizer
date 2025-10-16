import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class EditorManager {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private resolvePromise: ((value: string | undefined) => void) | undefined;
    private originalDocumentUri: vscode.Uri | undefined;
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }
    
    public async openEditor(htmlContent: string, metadata?: { fileName?: string }): Promise<string | undefined> {
        // Save reference to the currently active document
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            this.originalDocumentUri = activeEditor.document.uri;
        }
        
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            
            if (this.panel) {
                this.panel.reveal(vscode.ViewColumn.One);
                this.updateContent(htmlContent);
            } else {
                this.createPanel(htmlContent, metadata);
            }
        });
    }
    
    private createPanel(htmlContent: string, metadata?: { fileName?: string }): void {
        const title = metadata?.fileName ? `Editing: ${metadata.fileName}` : 'Dew Drop Editor';
        
        this.panel = vscode.window.createWebviewPanel(
            'dewDropEditor',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
                    vscode.Uri.file(path.join(this.context.extensionPath, 'webview'))
                ],
                retainContextWhenHidden: true
            }
        );
        
        this.panel.webview.html = this.getWebviewContent(htmlContent);
        
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'save':
                        // Save without closing, no formatting
                        await this.saveContent(message.content, false, false);
                        break;
                        
                    case 'saveAndClose':
                        // Save and close the editor, with formatting
                        await this.saveContent(message.content, true, true);
                        break;
                        
                    case 'saveAndPublish':
                        // Save with formatting, then publish
                        await this.saveContent(message.content, false, true);
                        await this.saveAndPublishContent(message.content);
                        if (this.resolvePromise) {
                            this.resolvePromise(message.content);
                            this.resolvePromise = undefined;
                        }
                        this.panel?.dispose();
                        break;
                        
                    case 'cancel':
                        if (this.resolvePromise) {
                            this.resolvePromise(undefined);
                            this.resolvePromise = undefined;
                        }
                        this.panel?.dispose();
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
        
        this.panel.onDidDispose(
            () => {
                if (this.resolvePromise) {
                    this.resolvePromise(undefined);
                    this.resolvePromise = undefined;
                }
                this.panel = undefined;
                this.originalDocumentUri = undefined;
            },
            undefined,
            this.context.subscriptions
        );
    }
    
    private updateContent(htmlContent: string): void {
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'updateContent',
                content: htmlContent
            });
        }
    }
    
    private getWebviewContent(htmlContent: string): string {
        if (!this.panel) {
            throw new Error('Panel not initialized');
        }
        
        const tinyMcePath = path.join(this.context.extensionPath, 'media', 'tinymce', 'tinymce.min.js');
        const tinyMceUri = this.panel.webview.asWebviewUri(vscode.Uri.file(tinyMcePath));
        const baseUrl = this.panel.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'tinymce'))
        ).toString();
        
        // Extract only the body content from the HTML file
        const bodyContent = this.extractBodyContent(htmlContent);
        
        // Load webview HTML template
        const templatePath = path.join(this.context.extensionPath, 'webview', 'editor.html');
        let html = fs.readFileSync(templatePath, 'utf8');
        
        // Replace placeholders
        html = html.replace(/{{cspSource}}/g, this.panel.webview.cspSource);
        html = html.replace(/{{tinyMceUri}}/g, tinyMceUri.toString());
        html = html.replace(/{{baseUrl}}/g, baseUrl);
        html = html.replace('{{initialContent}}', this.escapeHtml(bodyContent));
        
        return html;
    }
    
    private extractBodyContent(htmlContent: string): string {
        // Extract content between <body> tags
        const bodyStartMatch = htmlContent.match(/<body[^>]*>/i);
        const bodyEndMatch = htmlContent.match(/<\/body>/i);
        
        if (bodyStartMatch && bodyEndMatch) {
            const bodyStartIndex = bodyStartMatch.index! + bodyStartMatch[0].length;
            const bodyEndIndex = bodyEndMatch.index!;
            return htmlContent.substring(bodyStartIndex, bodyEndIndex).trim();
        }
        
        // If no body tags found, return the whole content
        return htmlContent;
    }
    
    private async saveContent(content: string, closeAfterSave: boolean = false, formatAfterSave: boolean = false): Promise<void> {
        if (!this.originalDocumentUri) {
            vscode.window.showErrorMessage('No document to save to.');
            return;
        }
        
        try {
            // Open the document
            const document = await vscode.workspace.openTextDocument(this.originalDocumentUri);
            const originalContent = document.getText();
            
            // Find the body tags and replace only the content between them
            const bodyStartMatch = originalContent.match(/<body[^>]*>/i);
            const bodyEndMatch = originalContent.match(/<\/body>/i);
            
            let newContent: string;
            
            if (bodyStartMatch && bodyEndMatch) {
                // HTML file with proper structure - replace only body content
                const bodyStartIndex = bodyStartMatch.index! + bodyStartMatch[0].length;
                const bodyEndIndex = bodyEndMatch.index!;
                
                const beforeBody = originalContent.substring(0, bodyStartIndex);
                const afterBody = originalContent.substring(bodyEndIndex);
                newContent = beforeBody + '\n' + content + '\n' + afterBody;
            } else {
                // HTML fragment without body tags - replace entire content
                newContent = content;
            }
            
            // Create an edit to replace all content
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(originalContent.length)
            );
            edit.replace(this.originalDocumentUri, fullRange, newContent);
            
            // Apply the edit and save
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
                await document.save();
                
                // Format the document only if requested (on close/publish)
                if (formatAfterSave) {
                    await this.formatDocument(document);
                }
                
                vscode.window.showInformationMessage('Changes saved successfully!');
                
                if (closeAfterSave && this.resolvePromise) {
                    this.resolvePromise(content);
                    this.resolvePromise = undefined;
                    this.panel?.dispose();
                }
            } else {
                vscode.window.showErrorMessage('Failed to apply changes.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save changes: ${error}`);
        }
    }
    
    private async formatDocument(document: vscode.TextDocument): Promise<void> {
        try {
            // Get HTML formatting settings
            const config = vscode.workspace.getConfiguration('html.format');
            const originalWrapAttributes = config.get('wrapAttributes');
            const originalWrapLineLength = config.get('wrapLineLength');
            
            // Temporarily update settings to prevent aggressive wrapping
            await config.update('wrapAttributes', 'preserve', vscode.ConfigurationTarget.Global);
            await config.update('wrapLineLength', 0, vscode.ConfigurationTarget.Global);
            
            try {
                // Format the document using the formatting API without showing it
                const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
                    'vscode.executeFormatDocumentProvider',
                    document.uri,
                    { tabSize: 4, insertSpaces: true }
                );
                
                if (edits && edits.length > 0) {
                    const workspaceEdit = new vscode.WorkspaceEdit();
                    workspaceEdit.set(document.uri, edits);
                    await vscode.workspace.applyEdit(workspaceEdit);
                    await document.save();
                }
            } finally {
                // Restore original settings
                await config.update('wrapAttributes', originalWrapAttributes, vscode.ConfigurationTarget.Global);
                await config.update('wrapLineLength', originalWrapLineLength, vscode.ConfigurationTarget.Global);
            }
        } catch (error) {
            // Formatting might fail if no formatter is available, but that's okay
            console.log('Could not format document:', error);
        }
    }
    
    private async saveAndPublishContent(content: string): Promise<void> {
        await this.saveContent(content);
        
        // Trigger WordPress publishing
        const result = await vscode.window.showInformationMessage(
            'Content saved! Would you like to publish to WordPress?',
            'Yes',
            'No'
        );
        
        if (result === 'Yes') {
            await vscode.commands.executeCommand('rssBlogCategorizer.publishToWordpress');
        }
    }
    
    private escapeHtml(html: string): string {
        return html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
