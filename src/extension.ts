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

    const addFeedCommand = vscode.commands.registerCommand('rssBlogCategorizer.addFeed', async () => {
        const feedUrl = await vscode.window.showInputBox({
            prompt: 'Enter RSS feed URL',
            placeHolder: 'https://example.com/feed.xml'
        });
        
        if (feedUrl) {
            await provider.addFeed(feedUrl);
            await provider.refresh();
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
    });

    context.subscriptions.push(
        refreshCommand,
        exportMarkdownCommand,
        exportHtmlCommand,
        openPostCommand,
        addFeedCommand,
        treeView,
        configChangeHandler,
        { dispose: () => clearInterval(refreshInterval) }
    );

    // Initial refresh
    provider.refresh().catch(console.error);
}

export function deactivate() {}