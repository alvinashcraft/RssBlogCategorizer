import * as vscode from 'vscode';
import { RSSBlogProvider } from './rssProvider';
import { ExportManager } from './exportManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('RSS Blog Categorizer extension is now active!');

    const provider = new RSSBlogProvider(context);
    
    // Register tree data provider
    const treeView = vscode.window.createTreeView('rssBlogCategorizerView', {
        treeDataProvider: provider,
        showCollapseAll: true
    });

    const exportManager = new ExportManager();

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
            await context.secrets.store('newsblurPassword', password);
            
            // Enable API usage
            await config.update('useNewsblurApi', true, vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage('NewsBlur credentials saved successfully! API mode enabled.');
            
            // Refresh to use new credentials
            await provider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save NewsBlur credentials: ${error}`);
        }
    });

    // Auto-refresh based on configuration
    const getRefreshInterval = () => {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        return (config.get<number>('refreshInterval') || 30) * 60 * 1000;
    };

    let refreshInterval = setInterval(async () => {
        await provider.refresh();
    }, getRefreshInterval());

    // Update interval when configuration changes
    const configChangeHandler = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('rssBlogCategorizer.refreshInterval')) {
            clearInterval(refreshInterval);
            refreshInterval = setInterval(async () => {
                await provider.refresh();
            }, getRefreshInterval());
        }
        
        // Auto-refresh when feed settings change
        if (event.affectsConfiguration('rssBlogCategorizer.feedUrl') ||
            event.affectsConfiguration('rssBlogCategorizer.recordCount') ||
            event.affectsConfiguration('rssBlogCategorizer.minimumDateTime')) {
            provider.refresh().catch(console.error);
        }
    });

    context.subscriptions.push(
        refreshCommand,
        exportMarkdownCommand,
        exportHtmlCommand,
        openPostCommand,
        setFeedCommand,
        setNewsblurCredentialsCommand,
        treeView,
        configChangeHandler,
        { dispose: () => clearInterval(refreshInterval) }
    );

    // Initial refresh
    provider.refresh().catch(console.error);
}

export function deactivate() {}