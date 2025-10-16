import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class EditorManager {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private resolvePromise: ((value: string | undefined) => void) | undefined;
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }
    
    public async openEditor(htmlContent: string, metadata?: { fileName?: string }): Promise<string | undefined> {
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
                        await this.saveContent(message.content);
                        if (this.resolvePromise) {
                            this.resolvePromise(message.content);
                            this.resolvePromise = undefined;
                        }
                        this.panel?.dispose();
                        break;
                        
                    case 'saveAndPublish':
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
        
        // Load webview HTML template
        const templatePath = path.join(this.context.extensionPath, 'webview', 'editor.html');
        let html = fs.readFileSync(templatePath, 'utf8');
        
        // Replace placeholders
        html = html.replace(/{{cspSource}}/g, this.panel.webview.cspSource);
        html = html.replace(/{{tinyMceUri}}/g, tinyMceUri.toString());
        html = html.replace(/{{baseUrl}}/g, baseUrl);
        html = html.replace('{{initialContent}}', this.escapeHtml(htmlContent));
        
        return html;
    }
    
    private async saveContent(content: string): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                activeEditor.document.positionAt(0),
                activeEditor.document.positionAt(activeEditor.document.getText().length)
            );
            edit.replace(activeEditor.document.uri, fullRange, content);
            await vscode.workspace.applyEdit(edit);
            await activeEditor.document.save();
            vscode.window.showInformationMessage('Changes saved successfully!');
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
