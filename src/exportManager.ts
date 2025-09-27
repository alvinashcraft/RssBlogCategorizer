import * as vscode from 'vscode';
import * as https from 'https';
import { XMLParser } from 'fast-xml-parser';
import { BlogPost } from './rssProvider';

export class ExportManager {
    
    async exportAsMarkdown(posts: BlogPost[]): Promise<void> {
        const content = await this.generateMarkdownContent(posts);
        await this.saveExport(content, 'markdown', 'md');
    }

    async exportAsHtml(posts: BlogPost[]): Promise<void> {
        const content = await this.generateHtmlContent(posts);
        await this.saveExport(content, 'html', 'html');
    }

    private async generateDewDropTitle(): Promise<string> {
        console.log('Generating Dew Drop title based on latest post...');
        
        try {
            // Get the latest Dew Drop post number (this method has its own error handling)
            const latestPostNumber = await this.getLatestDewDropNumber();
            const nextPostNumber = latestPostNumber + 1;
            
            // Format today's date
            const today = new Date();
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const month = monthNames[today.getMonth()];
            const day = today.getDate();
            const year = today.getFullYear();
            
            const title = `Dew Drop - ${month} ${day}, ${year} (#${nextPostNumber})`;
            console.log(`Generated Dew Drop title: "${title}"`);
            
            // Show a notification to confirm the title generation worked
            vscode.window.showInformationMessage(`Generated title: ${title}`);
            
            return title;
            
        } catch (error) {
            console.error('Unexpected error in generateDewDropTitle:', error);
            // Even if there's an error, still generate a Dew Drop title with fallback number
            const today = new Date();
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const month = monthNames[today.getMonth()];
            const day = today.getDate();
            const year = today.getFullYear();
            
            const fallbackTitle = `Dew Drop - ${month} ${day}, ${year} (#4507)`;
            console.log(`Using fallback Dew Drop title: "${fallbackTitle}"`);
            vscode.window.showWarningMessage(`Using fallback title: ${fallbackTitle}`);
            return fallbackTitle;
        }
    }

    private async getLatestDewDropNumber(): Promise<number> {
        try {
            console.log('Fetching RSS feed from alvinashcraft.com...');
            vscode.window.showInformationMessage('Fetching latest Dew Drop post number...');
            
            // Fetch the RSS feed from alvinashcraft.com
            const rssData = await this.fetchRssFeed('https://www.alvinashcraft.com/feed/');
            console.log(`RSS feed fetched, length: ${rssData.length} characters`);
            
            // Parse and find Dew Drop posts
            const parser = new XMLParser({ 
                ignoreAttributes: false, 
                attributeNamePrefix: '@_',
                parseAttributeValue: true,
                trimValues: true
            });
            const result = parser.parse(rssData);
            const items = result.rss?.channel?.item || [];
            console.log(`Found ${items.length} items in RSS feed`);
            
            // Look for the latest Dew Drop post and extract the number
            for (let i = 0; i < Math.min(items.length, 10); i++) { // Check first 10 items
                const item = items[i];
                let title = item.title || '';
                
                // Decode HTML entities
                title = title
                    .replace(/&#8211;/g, '–')
                    .replace(/&#8212;/g, '—')
                    .replace(/&ndash;/g, '–')
                    .replace(/&mdash;/g, '—')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'");
                
                console.log(`Checking post ${i + 1}: "${title}"`);
                
                // Match pattern like "Dew Drop – September 26, 2025 (#4506)" or similar variations
                const match = title.match(/#(\d+)\)/);
                if (match && title.toLowerCase().includes('dew drop')) {
                    const postNumber = parseInt(match[1], 10);
                    console.log(`✓ Latest Dew Drop post found: "${title}" (number: ${postNumber})`);
                    vscode.window.showInformationMessage(`Found latest Dew Drop: #${postNumber}`);
                    return postNumber;
                }
            }
            
            console.warn('No Dew Drop posts with numbers found in first 10 items, using fallback number 4506');
            vscode.window.showWarningMessage('No Dew Drop posts found, using fallback #4506');
            return 4506; // Fallback - change this number as needed
            
        } catch (error) {
            console.error('Error fetching latest Dew Drop number:', error);
            vscode.window.showErrorMessage(`Failed to fetch Dew Drop number: ${error}`);
            console.log('Using fallback number 4506');
            return 4506; // Fallback - change this number as needed
        }
    }

    private async fetchRssFeed(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            console.log(`Fetching RSS from: ${url}`);
            const options = {
                timeout: 10000, // 10 second timeout
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            };

            const request = https.get(url, options, (response) => {
                console.log(`HTTP response status: ${response.statusCode}`);
                
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    console.log('RSS feed download completed');
                    resolve(data);
                });
            });

            request.on('error', (error) => {
                console.error('RSS fetch error:', error);
                reject(error);
            });

            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    private async generateMarkdownContent(posts: BlogPost[]): Promise<string> {
        const groupedPosts = this.groupPostsByCategory(posts);
        const dewDropTitle = await this.generateDewDropTitle();
        
        let content = `# ${dewDropTitle}\n\n`;
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

    private async generateHtmlContent(posts: BlogPost[]): Promise<string> {
        const groupedPosts = this.groupPostsByCategory(posts);
        const dewDropTitle = await this.generateDewDropTitle();
        
        const htmlStart = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(dewDropTitle)}</title>
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
        <h1>${this.escapeHtml(dewDropTitle)}</h1>
        <p><em>Generated on ${new Date().toLocaleDateString()}</em></p>
    </div>`;

        let categoriesHtml = '';
        Object.entries(groupedPosts).forEach(([category, categoryPosts]) => {
            categoriesHtml += `    <div class="category">\n        <h2>${category}</h2>\n`;
            
            categoryPosts.forEach(post => {
                categoriesHtml += `        <div class="post">\n`;
                categoriesHtml += `            <h3><a href="${post.link}" target="_blank">${this.escapeHtml(post.title)}</a></h3>\n`;
                
                if (post.description) {
                    categoriesHtml += `            <div class="description">${this.escapeHtml(post.description)}</div>\n`;
                }
                
                categoriesHtml += `            <div class="meta">\n`;
                categoriesHtml += `                <strong>Source:</strong> ${this.escapeHtml(post.source)}`;
                
                if (post.pubDate) {
                    categoriesHtml += ` | <strong>Published:</strong> ${new Date(post.pubDate).toLocaleDateString()}`;
                }
                
                categoriesHtml += `\n            </div>\n        </div>\n`;
            });
            
            categoriesHtml += `    </div>\n`;
        });

        const htmlEnd = `</body>\n</html>`;
        
        return htmlStart + categoriesHtml + htmlEnd;
    }

    private groupPostsByCategory(posts: BlogPost[]): Record<string, BlogPost[]> {
        const grouped: Record<string, BlogPost[]> = {};
        const seenLinks = new Set<string>(); // Deduplicate by link
        
        posts.forEach(post => {
            // Skip duplicates based on link
            if (seenLinks.has(post.link)) {
                console.log(`Export: Skipping duplicate post: ${post.title}`);
                return;
            }
            seenLinks.add(post.link);
            
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
        const dewDropTitle = await this.generateDewDropTitle();
        const filename = `${dewDropTitle.replace(/[<>:"/\\|?*]/g, '-')}.${extension}`;
        
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
