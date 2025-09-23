import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BlogPost } from './rssProvider';

export class ExportManager {
    
    async exportAsMarkdown(posts: BlogPost[]): Promise<void> {
        const content = this.generateMarkdownContent(posts);
        await this.saveExport(content, 'markdown', 'md');
    }

    async exportAsHtml(posts: BlogPost[]): Promise<void> {
        const content = this.generateHtmlContent(posts);
        await this.saveExport(content, 'html', 'html');
    }

    private generateMarkdownContent(posts: BlogPost[]): string {
        const groupedPosts = this.groupPostsByCategory(posts);
        let content = `# Developer Blog Posts\n\n`;
        content += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;

        Object.entries(groupedPosts).forEach(([category, categoryPosts]) => {
            content += `## ${category}\n\n`;
            
            categoryPosts.forEach(post => {
                content += `### [${post.title}](${post.link})\n\n`;
                if (post.description) {
                    content += `${post.description}\n\n`;
                }
                content += `*Source: ${post.source}*\n`;
                if (post.pubDate) {
                    content += `*Published: ${new Date(post.pubDate).toLocaleDateString()}*\n`;
                }
                content += `\n---\n\n`;
            });
        });

        return content;
    }

    private generateHtmlContent(posts: BlogPost[]): string {
        const groupedPosts = this.groupPostsByCategory(posts);
        let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Developer Blog Posts</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .header {
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .category {
            margin-bottom: 40px;
        }
        .category h2 {
            color: #2c3e50;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        .post {
            background: #f9f9f9;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        .post h3 {
            margin-top: 0;
        }
        .post a {
            color: #3498db;
            text-decoration: none;
        }
        .post a:hover {
            text-decoration: underline;
        }
        .meta {
            color: #666;
            font-size: 0.9em;
            margin-top: 10px;
        }
        .description {
            margin: 10px 0;
            color: #555;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Developer Blog Posts</h1>
        <p><em>Generated on ${new Date().toLocaleDateString()}</em></p>
    </div>
`;

        Object.entries(groupedPosts).forEach(([category, categoryPosts]) => {
            content += `    <div class="category">
        <h2>${category}</h2>
`;
            
            categoryPosts.forEach(post => {
                content += `        <div class="post">
            <h3><a href="${post.link}" target="_blank">${this.escapeHtml(post.title)}</a></h3>
`;
                if (post.description) {
                    content += `            <div class="description">${this.escapeHtml(post.description)}</div>
`;
                }
                content += `            <div class="meta">
                <strong>Source:</strong> ${this.escapeHtml(post.source)}
`;
                if (post.pubDate) {
                    content += ` | <strong>Published:</strong> ${new Date(post.pubDate).toLocaleDateString()}`;
                }
                content += `
            </div>
        </div>
`;
            });
            
            content += `    </div>
`;
        });

        content += `</body>
</html>`;

        return content;
    }

    private groupPostsByCategory(posts: BlogPost[]): Record<string, BlogPost[]> {
        const grouped: Record<string, BlogPost[]> = {};
        
        posts.forEach(post => {
            if (!grouped[post.category]) {
                grouped[post.category] = [];
            }
            grouped[post.category].push(post);
        });

        // Sort posts within each category by date (newest first)
        Object.values(grouped).forEach(categoryPosts => {
            categoryPosts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        });

        return grouped;
    }

    private async saveExport(content: string, format: string, extension: string): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `blog-posts-${timestamp}.${extension}`;
        
        let defaultUri;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            defaultUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, filename);
        }
        
        const uri = await vscode.window.showSaveDialog({
            defaultUri: defaultUri,
            filters: {
                [format.toUpperCase()]: [extension]
            }
        });

        if (uri) {
            try {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
                vscode.window.showInformationMessage(`Blog posts exported successfully to ${format.toUpperCase()} format!`);
                
                // Open the exported file
                const doc = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to export blog posts: ${error}`);
            }
        }
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}