import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { RSSBlogProvider } from './rssProvider';
import { ExportManager } from './exportManager';
import { WordPressManager } from './wordpressManager';
import { EditorManager } from './editorManager';
import { NEWSBLUR_PASSWORD_KEY, SUBMISSION_API_KEY } from './constants';

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
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to refresh feeds: {0}', errorMessage));
            console.error('Refresh command failed:', error);
        }
    });

    const exportMarkdownCommand = vscode.commands.registerCommand('rssBlogCategorizer.exportMarkdown', async () => {
        try {
            const posts = await provider.getAllPosts();
            if (posts.length === 0) {
                vscode.window.showWarningMessage(vscode.l10n.t('No posts available to export. Please refresh the feed first.'));
                return;
            }
            await exportManager.exportAsMarkdown(posts);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to export Markdown: {0}', errorMessage));
            console.error('Markdown export failed:', error);
        }
    });

    const exportHtmlCommand = vscode.commands.registerCommand('rssBlogCategorizer.exportHtml', async () => {
        try {
            const posts = await provider.getAllPosts();
            if (posts.length === 0) {
                vscode.window.showWarningMessage(vscode.l10n.t('No posts available to export. Please refresh the feed first.'));
                return;
            }
            await exportManager.exportAsHtml(posts);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to export HTML: {0}', errorMessage));
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
                prompt: vscode.l10n.t('Set RSS feed URL'),
                placeHolder: 'https://example.com/feed.xml',
                value: currentFeedUrl,
                validateInput: (value) => {
                    if (!value) {
                        return vscode.l10n.t('URL cannot be empty');
                    }
                    try {
                        new URL(value);
                        return null; // Valid URL
                    } catch {
                        return vscode.l10n.t('Please enter a valid URL (e.g., https://example.com/feed.xml)');
                    }
                }
            });
            
            if (feedUrl && feedUrl !== currentFeedUrl) {
                await provider.setFeedUrl(feedUrl);
                await provider.refresh();
                vscode.window.showInformationMessage(vscode.l10n.t('RSS feed updated to: {0}', feedUrl));
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to update feed URL: {0}', errorMessage));
            console.error('Set feed URL failed:', error);
        }
    });

    const setNewsblurCredentialsCommand = vscode.commands.registerCommand('rssBlogCategorizer.setNewsblurCredentials', async () => {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const currentUsername = config.get<string>('newsblurUsername') || '';
        
        // Get username
        const username = await vscode.window.showInputBox({
            prompt: vscode.l10n.t('Enter NewsBlur username'),
            placeHolder: 'username',
            value: currentUsername
        });
        
        if (!username) {
            return; // User cancelled
        }
        
        // Get password securely
        const password = await vscode.window.showInputBox({
            prompt: vscode.l10n.t('Enter NewsBlur password for user: {0}', username),
            password: true,
            placeHolder: vscode.l10n.t('Enter your NewsBlur password')
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
            
            vscode.window.showInformationMessage(vscode.l10n.t('NewsBlur credentials saved successfully! API mode enabled.'));
            
            // Refresh to use new credentials
            await provider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to save NewsBlur credentials: {0}', String(error)));
        }
    });

    const setWordpressCredentialsCommand = vscode.commands.registerCommand('rssBlogCategorizer.setWordpressCredentials', async () => {
        await wordpressManager.setWordpressCredentials();
    });

    const setSubmissionApiKeyCommand = vscode.commands.registerCommand('rssBlogCategorizer.setSubmissionApiKey', async () => {
        const rawApiKey = await vscode.window.showInputBox({
            prompt: vscode.l10n.t('Enter submissions API key'),
            password: true,
            placeHolder: vscode.l10n.t('Enter your submissions API key')
        });

        if (rawApiKey === undefined) {
            return;
        }

        const apiKey = rawApiKey.trim();
        if (!apiKey) {
            vscode.window.showWarningMessage(vscode.l10n.t('Submissions API key cannot be empty.'));
            return;
        }

        try {
            await context.secrets.store(SUBMISSION_API_KEY, apiKey);
            vscode.window.showInformationMessage(vscode.l10n.t('Submissions API key saved securely.'));
            await provider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to save submissions API key: {0}', String(error)));
        }
    });

    const testWordpressConnectionCommand = vscode.commands.registerCommand('rssBlogCategorizer.testWordpressConnection', async () => {
        await wordpressManager.testConnection();
    });

    const publishToWordpressCommand = vscode.commands.registerCommand('rssBlogCategorizer.publishToWordpress', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage(vscode.l10n.t('No active editor found. Please open an HTML file to publish.'));
            return;
        }

        const document = activeEditor.document;
        if (!document.fileName.endsWith('.html')) {
            vscode.window.showErrorMessage(vscode.l10n.t('Please open an HTML file to publish to WordPress.'));
            return;
        }

        // Check if this is a Dew Drop post (contains "Dew Drop" in title or filename)
        const isDewDrop = document.fileName.includes('Dew Drop') || 
                         document.getText().toLowerCase().includes('dew drop');
        
        if (!isDewDrop) {
            const proceed = await vscode.window.showWarningMessage(
                vscode.l10n.t('This doesn\'t appear to be a Dew Drop post. Do you want to publish it anyway?'),
                vscode.l10n.t('Yes'), vscode.l10n.t('No')
            );
            if (proceed !== vscode.l10n.t('Yes')) {
                return;
            }
        }

        const publishResult = await wordpressManager.publishHtmlFile(document);
        if (publishResult.success && publishResult.wasPublished) {
            await provider.processPendingSubmissionsAfterPublish();
        }
    });

    const publishToMorningDewNextGenCommand = vscode.commands.registerCommand('rssBlogCategorizer.publishToMorningDewNextGen', async () => {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const repoPath = (config.get<string>('dewNextGenRepoPath') || '').trim();

        if (!repoPath) {
            const choice = await vscode.window.showErrorMessage(
                vscode.l10n.t('Morning Dew NextGen repo path is not configured. Set "rssBlogCategorizer.dewNextGenRepoPath" in settings.'),
                vscode.l10n.t('Open Settings')
            );
            if (choice === vscode.l10n.t('Open Settings')) {
                await vscode.commands.executeCommand('workbench.action.openSettings', 'rssBlogCategorizer.dewNextGenRepoPath');
            }
            return;
        }

        const scriptRelativePath = path.join('infra', 'scripts', 'import-html-post.ps1');
        const scriptFullPath = path.join(repoPath, scriptRelativePath);
        if (!fs.existsSync(scriptFullPath)) {
            vscode.window.showErrorMessage(
                vscode.l10n.t('Import script not found at {0}. Verify the configured Morning Dew NextGen repo path.', scriptFullPath)
            );
            return;
        }

        // Resolve the HTML file: prefer the active text editor, then fall back
        // to the document backing the WYSIWYG editor panel.
        let htmlUri: vscode.Uri | undefined;
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName.toLowerCase().endsWith('.html')) {
            htmlUri = activeEditor.document.uri;
        } else {
            const wysiwygUri = editorManager.getCurrentFileUri();
            if (wysiwygUri && wysiwygUri.fsPath.toLowerCase().endsWith('.html')) {
                htmlUri = wysiwygUri;
            }
        }

        if (!htmlUri) {
            vscode.window.showErrorMessage(vscode.l10n.t('Open the exported Dew Drop HTML file (or its WYSIWYG editor) before running this command.'));
            return;
        }

        if (htmlUri.scheme !== 'file') {
            vscode.window.showErrorMessage(vscode.l10n.t('Morning Dew NextGen import requires a file on disk; the current document is not a local file.'));
            return;
        }

        const htmlPath = htmlUri.fsPath;
        if (!fs.existsSync(htmlPath)) {
            vscode.window.showErrorMessage(vscode.l10n.t('HTML file not found on disk: {0}. Save the file before running this command.', htmlPath));
            return;
        }

        const terminalName = vscode.l10n.t('Morning Dew NextGen Import');
        const shellArgs = [
            '-NoProfile',
            '-File', scriptFullPath,
            '-Path', htmlPath
        ];

        const task = new vscode.Task(
            { type: 'shell', task: 'morning-dew-nextgen-import' },
            vscode.TaskScope.Workspace,
            terminalName,
            'Dev Feed Curator',
            new vscode.ShellExecution(
                'pwsh',
                shellArgs,
                { cwd: repoPath }
            )
        );
        task.presentationOptions = {
            reveal: vscode.TaskRevealKind.Always,
            panel: vscode.TaskPanelKind.Dedicated,
            focus: false,
            echo: true,
            clear: true,
            showReuseMessage: false
        };
        task.isBackground = false;

        const baseFileName = path.basename(htmlPath);

        let endDisposable: vscode.Disposable | undefined;
        const completion = new Promise<number | undefined>((resolve) => {
            endDisposable = vscode.tasks.onDidEndTaskProcess(event => {
                if (event.execution.task === task) {
                    endDisposable?.dispose();
                    endDisposable = undefined;
                    resolve(event.exitCode);
                }
            });
        });

        try {
            await vscode.tasks.executeTask(task);
        } catch (error) {
            endDisposable?.dispose();
            endDisposable = undefined;
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(
                vscode.l10n.t('Morning Dew NextGen import failed for {0} (exit code {1}). See the terminal for details.', baseFileName, message)
            );
            return;
        }

        vscode.window.showInformationMessage(
            vscode.l10n.t('Running Morning Dew NextGen import for {0}…', baseFileName)
        );

        const exitCode = await completion;
        if (exitCode === 0) {
            try {
                await provider.processPendingSubmissionsAfterPublish();
            } catch (error) {
                console.error('Failed to mark pending submissions as processed after Morning Dew NextGen import:', error);
            }

            // Close the WYSIWYG editor panel if the user invoked the command from it.
            editorManager.closePanel();

            // Mirror the WordPress publish flow: optionally open the blog URL.
            const openBlogAfterPublish = config.get<boolean>('openBlogAfterPublish', true);
            if (openBlogAfterPublish) {
                const blogUrl = (config.get<string>('wordpressBlogUrl') || '').trim();
                if (blogUrl) {
                    try {
                        await vscode.env.openExternal(vscode.Uri.parse(blogUrl));
                    } catch (error) {
                        console.error('Failed to open blog URL after Morning Dew NextGen import:', error);
                    }
                }
            }

            vscode.window.showInformationMessage(
                vscode.l10n.t('Morning Dew NextGen import completed for {0}. Review the generated markdown, then commit and push manually.', baseFileName)
            );
        } else {
            vscode.window.showErrorMessage(
                vscode.l10n.t('Morning Dew NextGen import failed for {0} (exit code {1}). See the terminal for details.', baseFileName, String(exitCode ?? 'unknown'))
            );
        }
    });

    const openWysiwygEditorCommand = vscode.commands.registerCommand('rssBlogCategorizer.openWysiwygEditor', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage(vscode.l10n.t('No active editor found. Please open an HTML or Markdown file first.'));
            return;
        }

        const document = activeEditor.document;
        const isHtml = document.fileName.endsWith('.html');
        const isMarkdown = document.fileName.endsWith('.md') || document.fileName.endsWith('.markdown');
        
        if (!isHtml && !isMarkdown) {
            vscode.window.showErrorMessage(vscode.l10n.t('Please open an HTML or Markdown file to edit with the WYSIWYG editor.'));
            return;
        }

        const content = document.getText();
        const fileName = document.fileName.split(/[/\\]/).pop() || 'Untitled';
        const fileType = isMarkdown ? 'markdown' : 'html';
        
        const editedContent = await editorManager.openEditor(content, { fileName, fileType });
        
        if (editedContent) {
            vscode.window.showInformationMessage(vscode.l10n.t('Content updated successfully!'));
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
        setSubmissionApiKeyCommand,
        setWordpressCredentialsCommand,
        testWordpressConnectionCommand,
        publishToWordpressCommand,
        publishToMorningDewNextGenCommand,
        openWysiwygEditorCommand,
        treeView,
        configChangeHandler,
        refreshIntervalDisposable
    );

    // No initial refresh - manual only unless auto-refresh is enabled
    console.log('Dev Feed Curator extension activated. Use refresh button or enable auto-refresh in settings.');
}

export function deactivate() {}