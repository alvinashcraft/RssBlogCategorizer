import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
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
        const groupedPosts = await this.groupPostsByCategory(posts);
        const dewDropTitle = await this.generateDewDropTitle();
        
        let content = `# ${dewDropTitle}\n\n`;

        Object.entries(groupedPosts).forEach(([category, categoryPosts]: [string, BlogPost[]]) => {
            content += `### ${category}\n\n`;
            
            if (category === "Top Links") {
                // Add placeholder comment for manual editing
                content += `<!-- Add top links here manually -->\n\n`;
            } else {
                categoryPosts.forEach(post => {
                    content += `- [${post.title}](${post.link}) (${post.author})\n`;
                });
                content += `\n`;
            }
        });

        // Add Geek Shelf section
        const geekShelfMarkdown = await this.generateGeekShelfMarkdown();
        content += geekShelfMarkdown;

        return content;
    }

    private async generateHtmlContent(posts: BlogPost[]): Promise<string> {
        const groupedPosts = await this.groupPostsByCategory(posts);
        const dewDropTitle = await this.generateDewDropTitle();
        
        const htmlStart = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(dewDropTitle)}</title>
</head>
<body>
    <div>
        <h1>${this.escapeHtml(dewDropTitle)}</h1>
    </div>`;

        let categoriesHtml = '';
        Object.entries(groupedPosts).forEach(([category, categoryPosts]: [string, BlogPost[]]) => {
            categoriesHtml += `\n    <div>\n        <h3>${category}</h3>\n`;
            
            if (category === "Top Links") {
                // Add empty div for manual editing
                categoriesHtml += `        <!-- Add top links here manually -->\n        <div></div>\n`;
            } else {
                categoriesHtml += `        <ul>\n`;
                categoryPosts.forEach(post => {
                    categoriesHtml += `            <li><a href="${post.link}" target="_blank">${this.escapeHtml(post.title)}</a> (${this.escapeHtml(post.author)})</li>\n`;
                });
                categoriesHtml += `        </ul>\n`;
            }
            
            categoriesHtml += `    </div>\n`;
        });

        // Add Geek Shelf section
        const geekShelfHtml = await this.generateGeekShelfHtml();
        
        const htmlEnd = `</body>\n</html>`;
        
        return htmlStart + categoriesHtml + geekShelfHtml + htmlEnd;
    }

    private async groupPostsByCategory(posts: BlogPost[]): Promise<Record<string, BlogPost[]>> {
        // Load categories config to get the correct order
        const categoriesConfig = await this.loadCategoriesConfig();
        const categoryOrder = categoriesConfig ? Object.keys(categoriesConfig.categories) : [];
        
        const grouped: Record<string, BlogPost[]> = {};
        const seenLinks = new Set<string>(); // Deduplicate by link
        
        // Always add "Top Links" as the first category (empty)
        grouped["Top Links"] = [];
        
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

        // Create ordered result with "Top Links" first, then categories in JSON order
        const orderedResult: Record<string, BlogPost[]> = {};
        
        // Always put "Top Links" first
        orderedResult["Top Links"] = grouped["Top Links"];
        
        // Add categories in the order they appear in the JSON file
        categoryOrder.forEach(categoryName => {
            if (grouped[categoryName] && grouped[categoryName].length > 0) {
                orderedResult[categoryName] = grouped[categoryName];
            }
        });
        
        // Add any remaining categories not in the JSON (like "General" or others)
        Object.keys(grouped).forEach(categoryName => {
            if (categoryName !== "Top Links" && !orderedResult[categoryName] && grouped[categoryName].length > 0) {
                orderedResult[categoryName] = grouped[categoryName];
            }
        });

        return orderedResult;
    }

    private async loadCategoriesConfig(): Promise<any> {
        try {
            // Try to load from extension context first (packaged extension)
            let categoriesPath;
            try {
                categoriesPath = vscode.Uri.joinPath(vscode.extensions.getExtension('publisher.rss-blog-categorizer')!.extensionUri, 'categories.json').fsPath;
            } catch {
                // Fallback for development/testing
                categoriesPath = path.join(__dirname, '..', 'categories.json');
            }
            
            const categoriesData = fs.readFileSync(categoriesPath, 'utf8');
            return JSON.parse(categoriesData);
        } catch (error) {
            console.error('Failed to load categories config for ordering:', error);
            return null;
        }
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

    private async generateGeekShelfHtml(): Promise<string> {
        const book = await this.getBookOfTheDay();
        if (!book) {
            return '';
        }

        return `
    <div>
        <h3>Geek Shelf</h3>
        <div style="display: flex; align-items: flex-start; gap: 15px;">
            <img src="${book.imageUrl}" alt="${this.escapeHtml(book.title)}" style="width: 100px; height: auto;">
            <div>
                <a href="${book.productUrl}" target="_blank">${this.escapeHtml(book.title)}</a> (${this.escapeHtml(book.author)}) <em>- Referral Link</em>
                <p>${this.escapeHtml(book.description)}</p>
            </div>
        </div>
    </div>`;
    }

    private async generateGeekShelfMarkdown(): Promise<string> {
        const book = await this.getBookOfTheDay();
        if (!book) {
            return '';
        }

        return `### Geek Shelf

[![${book.title}](${book.imageUrl})](${book.productUrl})

[${book.title}](${book.productUrl}) (${book.author}) *- Referral Link*

${book.description}

`;
    }

    private async getBookOfTheDay(): Promise<any> {
        try {
            const books = await this.loadBooksConfig();
            if (!books || !books.books || books.books.length === 0) {
                return null;
            }

            // Use current date to select a book (rotates daily)
            const today = new Date();
            const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
            const bookIndex = dayOfYear % books.books.length;
            
            return books.books[bookIndex];
        } catch (error) {
            console.error('Error getting book of the day:', error);
            return null;
        }
    }

    private async loadBooksConfig(): Promise<any> {
        try {
            // Try to load from extension context first (packaged extension)
            let booksPath;
            try {
                booksPath = vscode.Uri.joinPath(vscode.extensions.getExtension('publisher.rss-blog-categorizer')!.extensionUri, 'books.json').fsPath;
            } catch {
                // Fallback for development/testing
                booksPath = path.join(__dirname, '..', 'books.json');
            }
            
            const booksData = fs.readFileSync(booksPath, 'utf8');
            return JSON.parse(booksData);
        } catch (error) {
            console.error('Failed to load books config:', error);
            return null;
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
