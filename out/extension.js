"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const rssProvider_1 = require("./rssProvider");
const exportManager_1 = require("./exportManager");
function activate(context) {
    console.log('RSS Blog Categorizer extension is now active!');
    const provider = new rssProvider_1.RSSBlogProvider(context);
    // Register tree data provider
    const treeView = vscode.window.createTreeView('rssBlogCategorizerView', {
        treeDataProvider: provider,
        showCollapseAll: true
    });
    const exportManager = new exportManager_1.ExportManager();
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
    const openPostCommand = vscode.commands.registerCommand('rssBlogCategorizer.openPost', (post) => {
        if (post && post.link) {
            vscode.env.openExternal(vscode.Uri.parse(post.link));
        }
    });
    const setFeedCommand = vscode.commands.registerCommand('rssBlogCategorizer.addFeed', async () => {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const currentFeedUrl = config.get('feedUrl') || 'https://dev.to/feed';
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
            }
            catch (error) {
                vscode.window.showErrorMessage(`Invalid URL format: ${feedUrl}`);
            }
        }
    });
    // Auto-refresh based on configuration
    const getRefreshInterval = () => {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        return (config.get('refreshInterval') || 30) * 60 * 1000;
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
    context.subscriptions.push(refreshCommand, exportMarkdownCommand, exportHtmlCommand, openPostCommand, setFeedCommand, treeView, configChangeHandler, { dispose: () => clearInterval(refreshInterval) });
    // Initial refresh
    provider.refresh().catch(console.error);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map