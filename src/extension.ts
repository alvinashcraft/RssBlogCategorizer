import * as vscode from 'vscode';
import { RSSBlogProvider } from './rssProvider';
import { ExportManager } from './exportManager';
import { WordPressManager } from './wordpressManager';
import { EditorManager } from './editorManager';
import { NEWSBLUR_PASSWORD_KEY } from './constants';

export function activate(context: vscode.ExtensionContext) {
    console.log('Dev Feed Curator extension is now active!');

    const provider = new RSSBlogProvider(context);
    
    // Register tree data provider
    const treeView = vscode.window.createTreeView('rssBlogCategorizerView', {
        treeDataProvider: provider,
        showCollapseAll: true
    });

    const exportManager = new ExportManager();
    const wordpressManager = new WordPressManager(context);
    const editorManager = new EditorManager(context);

    // Register commands
    const refreshCommand = vscode.commands.registerCommand('rssBlogCategorizer.refresh', async () => {
        try {
            await provider.refresh();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to refresh feeds: ${errorMessage}`);
            console.error('Refresh command failed:', error);
        }
    });

    const exportMarkdownCommand = vscode.commands.registerCommand('rssBlogCategorizer.exportMarkdown', async () => {
        try {
            const posts = await provider.getAllPosts();
            if (posts.length === 0) {
                vscode.window.showWarningMessage('No posts available to export. Please refresh the feed first.');
                return;
            }
            await exportManager.exportAsMarkdown(posts);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to export Markdown: ${errorMessage}`);
            console.error('Markdown export failed:', error);
        }
    });

    const exportHtmlCommand = vscode.commands.registerCommand('rssBlogCategorizer.exportHtml', async () => {
        try {
            const posts = await provider.getAllPosts();
            if (posts.length === 0) {
                vscode.window.showWarningMessage('No posts available to export. Please refresh the feed first.');
                return;
            }
            await exportManager.exportAsHtml(posts);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to export HTML: ${errorMessage}`);
            console.error('HTML export failed:', error);
        }
    });

    const openPostCommand = vscode.commands.registerCommand('rssBlogCategorizer.openPost', (post: any) => {
        if (post && post.link) {
            vscode.env.openExternal(vscode.Uri.parse(post.link));
        }
    });

    const setFeedCommand = vscode.commands.registerCommand('rssBlogCategorizer.addFeed', async () => {
        try {
            const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
            const currentFeedUrl = config.get<string>('feedUrl') || 'https://dev.to/feed';
            
            const feedUrl = await vscode.window.showInputBox({
                prompt: 'Set RSS feed URL',
                placeHolder: 'https://example.com/feed.xml',
                value: currentFeedUrl,
                validateInput: (value) => {
                    if (!value) {
                        return 'URL cannot be empty';
                    }
                    try {
                        new URL(value);
                        return null; // Valid URL
                    } catch {
                        return 'Please enter a valid URL (e.g., https://example.com/feed.xml)';
                    }
                }
            });
            
            if (feedUrl && feedUrl !== currentFeedUrl) {
                await provider.setFeedUrl(feedUrl);
                await provider.refresh();
                vscode.window.showInformationMessage(`RSS feed updated to: ${feedUrl}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to update feed URL: ${errorMessage}`);
            console.error('Set feed URL failed:', error);
        }
    });

    const setNewsblurCredentialsCommand = vscode.commands.registerCommand('rssBlogCategorizer.setNewsblurCredentials', async () => {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const currentUsername = config.get<string>('newsblurUsername') || '';
        
        // Get username
        const username = await vscode.window.showInputBox({
            prompt: 'Enter NewsBlur username',
            placeHolder: 'username',
            value: currentUsername
        });
        
        if (!username) {
            return; // User cancelled
        }
        
        // Get password securely
        const password = await vscode.window.showInputBox({
            prompt: `Enter NewsBlur password for user: ${username}`,
            password: true,
            placeHolder: 'Enter your NewsBlur password'
        });
        
        if (!password) {
            return; // User cancelled
        }
        
        try {
            // Save username in configuration
            await config.update('newsblurUsername', username, vscode.ConfigurationTarget.Global);
            
            // Save password securely
            await context.secrets.store(NEWSBLUR_PASSWORD_KEY, password);
            
            // Enable API usage
            await config.update('useNewsblurApi', true, vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage('NewsBlur credentials saved successfully! API mode enabled.');
            
            // Refresh to use new credentials
            await provider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save NewsBlur credentials: ${error}`);
        }
    });

    const setWordpressCredentialsCommand = vscode.commands.registerCommand('rssBlogCategorizer.setWordpressCredentials', async () => {
        await wordpressManager.setWordpressCredentials();
    });

    const testWordpressConnectionCommand = vscode.commands.registerCommand('rssBlogCategorizer.testWordpressConnection', async () => {
        await wordpressManager.testConnection();
    });

    const publishToWordpressCommand = vscode.commands.registerCommand('rssBlogCategorizer.publishToWordpress', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor found. Please open an HTML file to publish.');
            return;
        }

        const document = activeEditor.document;
        if (!document.fileName.endsWith('.html')) {
            vscode.window.showErrorMessage('Please open an HTML file to publish to WordPress.');
            return;
        }

        // Check if this is a Dew Drop post (contains "Dew Drop" in title or filename)
        const isDewDrop = document.fileName.includes('Dew Drop') || 
                         document.getText().toLowerCase().includes('dew drop');
        
        if (!isDewDrop) {
            const proceed = await vscode.window.showWarningMessage(
                'This doesn\'t appear to be a Dew Drop post. Do you want to publish it anyway?',
                'Yes', 'No'
            );
            if (proceed !== 'Yes') {
                return;
            }
        }

        await wordpressManager.publishHtmlFile(document);
    });

    const openWysiwygEditorCommand = vscode.commands.registerCommand('rssBlogCategorizer.openWysiwygEditor', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor found. Please open an HTML or Markdown file first.');
            return;
        }

        const document = activeEditor.document;
        const isHtml = document.fileName.endsWith('.html');
        const isMarkdown = document.fileName.endsWith('.md') || document.fileName.endsWith('.markdown');
        
        if (!isHtml && !isMarkdown) {
            vscode.window.showErrorMessage('Please open an HTML or Markdown file to edit with the WYSIWYG editor.');
            return;
        }

        const content = document.getText();
        const fileName = document.fileName.split(/[/\\]/).pop() || 'Untitled';
        const fileType = isMarkdown ? 'markdown' : 'html';
        
        const editedContent = await editorManager.openEditor(content, { fileName, fileType });
        
        if (editedContent) {
            vscode.window.showInformationMessage('Content updated successfully!');
        }
    });


    // Auto-refresh based on configuration
    const getRefreshInterval = () => {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        return (config.get<number>('refreshInterval') || 30) * 60 * 1000;
    };

    const isAutoRefreshEnabled = () => {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        return config.get<boolean>('enableAutoRefresh') || false;
    };

    let refreshInterval: ReturnType<typeof setInterval> | undefined;

    const setupAutoRefresh = () => {
        // Clear existing interval
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = undefined;
        }

        // Only setup auto-refresh if enabled
        if (isAutoRefreshEnabled()) {
            refreshInterval = setInterval(async () => {
                await provider.refresh();
            }, getRefreshInterval());
            console.log('Auto-refresh enabled with interval:', getRefreshInterval() / 60000, 'minutes');
        } else {
            console.log('Auto-refresh disabled - manual refresh only');
        }
    };

    // Setup initial auto-refresh state
    setupAutoRefresh();

    // Update interval when configuration changes
    const configChangeHandler = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('rssBlogCategorizer.enableAutoRefresh') ||
            event.affectsConfiguration('rssBlogCategorizer.refreshInterval')) {
            setupAutoRefresh();
        }
        
        // Auto-refresh when feed settings change (only if auto-refresh is enabled)
        if (event.affectsConfiguration('rssBlogCategorizer.feedUrl') ||
            event.affectsConfiguration('rssBlogCategorizer.recordCount') ||
            event.affectsConfiguration('rssBlogCategorizer.minimumDateTime')) {
            if (isAutoRefreshEnabled()) {
                provider.refresh().catch(console.error);
            }
        }
    });

    // Create proper disposable for refresh interval cleanup
    const refreshIntervalDisposable: vscode.Disposable = {
        dispose: () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = undefined;
                console.log('Auto-refresh interval cleared on extension deactivation');
            }
        }
    };

    context.subscriptions.push(
        refreshCommand,
        exportMarkdownCommand,
        exportHtmlCommand,
        openPostCommand,
        setFeedCommand,
        setNewsblurCredentialsCommand,
        setWordpressCredentialsCommand,
        testWordpressConnectionCommand,
        publishToWordpressCommand,
        openWysiwygEditorCommand,
        treeView,
        configChangeHandler,
        refreshIntervalDisposable
    );

    // No initial refresh - manual only unless auto-refresh is enabled
    console.log('Dev Feed Curator extension activated. Use refresh button or enable auto-refresh in settings.');
}

export function deactivate() {}