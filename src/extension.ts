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
        await provider.refresh();
    });

    const exportMarkdownCommand = vscode.commands.registerCommand('rssBlogCategorizer.exportMarkdown', async () => {
        const posts = await provider.getAllPosts();
        await exportManager.exportAsMarkdown(posts);
    });

    const exportHtmlCommand = vscode.commands.registerCommand('rssBlogCategorizer.exportHtml', async () => {
        const posts = await provider.getAllPosts();
        await exportManager.exportAsHtml(posts);
    });

    const openPostCommand = vscode.commands.registerCommand('rssBlogCategorizer.openPost', (post: any) => {
        if (post && post.link) {
            vscode.env.openExternal(vscode.Uri.parse(post.link));
        }
    });

    const setFeedCommand = vscode.commands.registerCommand('rssBlogCategorizer.addFeed', async () => {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const currentFeedUrl = config.get<string>('feedUrl') || 'https://dev.to/feed';
        
        const feedUrl = await vscode.window.showInputBox({
            prompt: 'Set RSS feed URL',
            placeHolder: 'https://example.com/feed.xml',
            value: currentFeedUrl
        });
        
        if (feedUrl && feedUrl !== currentFeedUrl) {
            try {
                await provider.setFeedUrl(feedUrl);
                await provider.refresh();
                vscode.window.showInformationMessage(`RSS feed updated to: ${feedUrl}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Invalid URL format: ${feedUrl}`);
            }
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
            vscode.window.showErrorMessage('No active editor found. Please open an HTML file first.');
            return;
        }

        const document = activeEditor.document;
        if (!document.fileName.endsWith('.html')) {
            vscode.window.showErrorMessage('Please open an HTML file to edit with the WYSIWYG editor.');
            return;
        }

        const htmlContent = document.getText();
        const fileName = document.fileName.split(/[/\\]/).pop() || 'Untitled';
        
        const editedContent = await editorManager.openEditor(htmlContent, { fileName, fileType: 'html' });
        
        if (editedContent) {
            vscode.window.showInformationMessage('Content updated successfully!');
        }
    });

    const openMarkdownEditorCommand = vscode.commands.registerCommand('rssBlogCategorizer.openMarkdownEditor', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor found. Please open a Markdown file first.');
            return;
        }

        const document = activeEditor.document;
        if (!document.fileName.endsWith('.md') && !document.fileName.endsWith('.markdown')) {
            vscode.window.showErrorMessage('Please open a Markdown file to edit with the StackEdit editor.');
            return;
        }

        const markdownContent = document.getText();
        const fileName = document.fileName.split(/[/\\]/).pop() || 'Untitled';
        
        const editedContent = await editorManager.openEditor(markdownContent, { fileName, fileType: 'markdown' });
        
        if (editedContent) {
            vscode.window.showInformationMessage('Markdown content updated successfully!');
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

    context.subscriptions.push(
        openMarkdownEditorCommand,
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
        { dispose: () => { if (refreshInterval) clearInterval(refreshInterval); } }
    );

    // No initial refresh - manual only unless auto-refresh is enabled
    console.log('Dev Feed Curator extension activated. Use refresh button or enable auto-refresh in settings.');
}

export function deactivate() {}