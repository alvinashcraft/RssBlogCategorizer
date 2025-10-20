import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { XMLParser } from 'fast-xml-parser';
import { BlogPost } from './rssProvider';

interface DometrainCourse {
    course_id: number;
    course_title: string;
    course_subtitle?: string;
    thumbnail_url: string;
    course_url: string;
    author_names: string[];
    duration?: string;
}

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

        for (const [category, categoryPosts] of Object.entries(groupedPosts)) {
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

            // Add Dometrain Course section after "Screencasts and Videos"
            if (category === "Screencasts and Videos") {
                const dometrainMarkdown = await this.generateDometrainMarkdown();
                content += dometrainMarkdown;
            }
        }

        // Add Geek Shelf section
        const geekShelfMarkdown = await this.generateGeekShelfMarkdown();
        content += geekShelfMarkdown;

        return content;
    }

    private async generateHtmlContent(posts: BlogPost[]): Promise<string> {
        const groupedPosts = await this.groupPostsByCategory(posts);
        const dewDropTitle = await this.generateDewDropTitle();
        
        // Get the setting for opening links in new tab
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const openInNewTab = config.get<boolean>('openLinksInNewTab') || false;
        const targetAttribute = openInNewTab ? ' target="_blank"' : '';
        
        const htmlStart = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(dewDropTitle)}</title>
</head>
<body>
    <h1>${this.escapeHtml(dewDropTitle)}</h1>`;

        let categoriesHtml = '';
        for (const [category, categoryPosts] of Object.entries(groupedPosts)) {
            console.log(`Processing category: "${category}"`);
            categoriesHtml += `\n    <h3>${category}</h3>\n`;
            
            if (category === "Top Links") {
                // Add Top Links placeholder for manual editing
                categoriesHtml += `    <ul>\n        <li>TBD</li>\n    </ul>\n`;
            } else if (categoryPosts.length === 0) {
                // Empty category - add placeholder
                categoriesHtml += `    <ul>\n        <li>TBD</li>\n    </ul>\n`;
            } else {
                categoriesHtml += `    <ul>\n`;
                categoryPosts.forEach(post => {
                    categoriesHtml += `        <li><a href="${post.link}"${targetAttribute}>${this.escapeHtml(post.title)}</a> (${this.escapeHtml(post.author)})</li>\n`;
                });
                categoriesHtml += `    </ul>\n`;
            }

            // Add Dometrain Course section after "Screencasts and Videos"
            if (category === "Screencasts and Videos") {
                console.log('Found "Screencasts and Videos" category, generating Dometrain section...');
                const dometrainHtml = await this.generateDometrainHtml(targetAttribute);
                console.log(`Dometrain HTML length: ${dometrainHtml.length}`);
                categoriesHtml += dometrainHtml;
            }
        }

        // Add Geek Shelf section
        const geekShelfHtml = await this.generateGeekShelfHtml(targetAttribute);
        
        const htmlEnd = `\n</body>\n</html>`;
        
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
        
        // Add ALL categories in the order they appear in the JSON file (even if empty)
        // BUT skip "More Link Collections" for now - we'll add it after "General"
        categoryOrder.forEach(categoryName => {
            if (categoryName !== "More Link Collections") {
                // Always include the category, even if it has no posts
                orderedResult[categoryName] = grouped[categoryName] || [];
            }
        });
        
        // Add the default category if it exists and isn't already included
        if (categoriesConfig?.defaultCategory && !orderedResult[categoriesConfig.defaultCategory]) {
            orderedResult[categoriesConfig.defaultCategory] = grouped[categoriesConfig.defaultCategory] || [];
        }
        
        // Now add "More Link Collections" after "General" (the default category)
        if (categoryOrder.includes("More Link Collections")) {
            orderedResult["More Link Collections"] = grouped["More Link Collections"] || [];
        }
        
        // Add any remaining categories not in the JSON (like unexpected categories)
        // Skip "Top Links" and "More Link Collections" since they're already positioned
        Object.keys(grouped).forEach(categoryName => {
            if (categoryName !== "Top Links" && 
                categoryName !== "More Link Collections" && 
                !orderedResult[categoryName]) {
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
        // Clean up the title for use as filename
        const cleanTitle = dewDropTitle
            .replace(/[<>:"/\\|?*#]/g, '')  // Remove invalid filename characters  
            .replace(/[()]/g, '')           // Remove parentheses
            .replace(/\s+/g, '_')           // Replace spaces with underscores
            .replace(/_+/g, '_')            // Replace multiple underscores with single
            .replace(/^_|_$/g, '')          // Remove leading/trailing underscores
            .trim();
        const filename = `${cleanTitle}.${extension}`;
        
        // Create default URI - use workspace folder if available, otherwise user's home directory
        let defaultUri;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            defaultUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, filename);
        } else {
            // Fallback: use OS home directory with the filename
            const homedir = os.homedir();
            defaultUri = vscode.Uri.file(path.join(homedir, 'Desktop', filename));
        }
        
        const uri = await vscode.window.showSaveDialog({
            defaultUri: defaultUri,
            saveLabel: `Save ${format.toUpperCase()}`,
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
                
                // For HTML files, offer to open in WYSIWYG editor
                if (extension === 'html') {
                    const choice = await vscode.window.showInformationMessage(
                        'Would you like to edit this post in the WYSIWYG editor?',
                        'Open in Editor',
                        'No Thanks'
                    );
                    
                    if (choice === 'Open in Editor') {
                        await vscode.commands.executeCommand('rssBlogCategorizer.openWysiwygEditor');
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to export blog posts: ${error}`);
            }
        }
    }

    private async generateGeekShelfHtml(targetAttribute: string = ''): Promise<string> {
        const book = await this.getBookOfTheDay();
        if (!book) {
            return '';
        }

        return `
    <h3>The Geek Shelf</h3>
    <div style="display: flex; align-items: flex-start; gap: 15px;">
        <a href="${book.productUrl}"${targetAttribute} style="display: flex; align-items: flex-start; gap: 15px; text-decoration: none; color: inherit;">
            <img src="${book.imageUrl}" alt="${this.escapeHtml(book.title)}" style="width: 100px; height: auto; flex-shrink: 0;">
            <div>
                <span style="text-decoration: underline; color: #0066cc;">${this.escapeHtml(book.title)}</span> (${this.escapeHtml(book.author)}) <em>- Referral Link</em>
                <p style="margin-top: 8px;">${this.escapeHtml(book.description)}</p>
            </div>
        </a>
    </div>`;
    }

    private async generateGeekShelfMarkdown(): Promise<string> {
        const book = await this.getBookOfTheDay();
        if (!book) {
            return '';
        }

        return `### The Geek Shelf

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

    private async generateDometrainHtml(targetAttribute: string = ''): Promise<string> {
        console.log('generateDometrainHtml called');
        const course = await this.getDometrainCourseOfTheDay();
        if (!course) {
            console.log('No Dometrain course returned, section will be empty');
            return '';
        }

        const authorNames = course.author_names.join(', ');
        const trackingUrl = `https://dometrain.com${course.course_url}?ref=alvin-ashcraft&promo=morning-dew`;

        console.log(`Generating Dometrain HTML for course: ${course.course_title}`);

        // Include the course ID in a hidden meta tag so we can update the setting after successful publish
        return `
    <!-- dometrain-course-id: ${course.course_id} -->
    <h3>Dometrain Course</h3>
    <div style="display: flex; align-items: flex-start; gap: 15px;">
        <a href="${trackingUrl}"${targetAttribute} style="display: flex; align-items: flex-start; gap: 15px; text-decoration: none; color: inherit;">
            <img src="https://dometrain.com${course.thumbnail_url}" alt="${this.escapeHtml(course.course_title)}" style="width: 100px; height: auto; flex-shrink: 0;">
            <div>
                <span style="text-decoration: underline; color: #0066cc;">${this.escapeHtml(course.course_title)}</span>${course.course_subtitle ? ': ' + this.escapeHtml(course.course_subtitle) : ''} (${this.escapeHtml(authorNames)}) <em>- Referral Link</em>
            </div>
        </a>
    </div>`;
    }

    private async generateDometrainMarkdown(): Promise<string> {
        const course = await this.getDometrainCourseOfTheDay();
        if (!course) {
            return '';
        }

        const authorNames = course.author_names.join(', ');
        const trackingUrl = `https://dometrain.com${course.course_url}?ref=alvin-ashcraft&promo=morning-dew`;
        const subtitle = course.course_subtitle ? `: ${course.course_subtitle}` : '';

        return `### Dometrain Course

[![${course.course_title}](https://dometrain.com${course.thumbnail_url})](${trackingUrl})

[${course.course_title}${subtitle}](${trackingUrl}) (${authorNames}) *- Referral Link*

`;
    }

    private async getDometrainCourseOfTheDay(): Promise<DometrainCourse | null> {
        try {
            // Check if Dometrain section is enabled
            const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
            const isEnabled = config.get<boolean>('enableDometrainSection');
            
            console.log(`Dometrain section enabled: ${isEnabled}`);
            
            if (!isEnabled) {
                console.log('Dometrain section is disabled in settings');
                return null;
            }

            // Fetch courses from Dometrain API
            console.log('Fetching Dometrain courses...');
            const coursesData = await this.fetchDometrainCourses();
            if (!coursesData || coursesData.length === 0) {
                console.error('No Dometrain courses found');
                return null;
            }

            console.log(`Fetched ${coursesData.length} total courses`);

            // Filter out courses with "Design Pattern" in the title
            const filteredCourses = coursesData.filter(
                (course: DometrainCourse) => !course.course_title.toLowerCase().includes('design pattern')
            );

            console.log(`After filtering: ${filteredCourses.length} courses (removed ${coursesData.length - filteredCourses.length} Design Pattern courses)`);

            if (filteredCourses.length === 0) {
                console.error('No Dometrain courses after filtering');
                return null;
            }

            // Get the last course ID from settings (convert to string for comparison)
            const lastCourseId = String(config.get<string>('dometrainLastCourseId') || '');
            
            console.log(`Last course ID from settings: "${lastCourseId}"`);
            
            // Find the index of the last course (by array position, not by ID order)
            let nextIndex = 0;
            if (lastCourseId) {
                // Convert all course IDs to strings for comparison
                const lastIndex = filteredCourses.findIndex((c: DometrainCourse) => String(c.course_id) === lastCourseId);
                console.log(`Found last course at index: ${lastIndex}`);
                
                if (lastIndex !== -1) {
                    // Move to next course in the array (cycles through in JSON order)
                    nextIndex = (lastIndex + 1) % filteredCourses.length;
                    console.log(`Next index will be: ${nextIndex} (cycling through ${filteredCourses.length} courses)`);
                } else {
                    console.log(`Last course ID "${lastCourseId}" not found in filtered list, starting from beginning`);
                }
            } else {
                console.log('No last course ID set, starting from beginning');
            }

            const selectedCourse = filteredCourses[nextIndex];
            
            // NOTE: Do NOT update the setting here. It will be updated after successful WordPress publish
            // to ensure the course only rotates when the post is actually published, not just exported.
            
            console.log(`Selected Dometrain course at index ${nextIndex}: "${selectedCourse.course_title}" (ID: ${selectedCourse.course_id})`);
            return selectedCourse;
            
        } catch (error) {
            console.error('Error getting Dometrain course of the day:', error);
            return null;
        }
    }

    private async fetchDometrainCourses(): Promise<DometrainCourse[] | null> {
        return new Promise((resolve) => {
            const url = 'https://dometrain.com/courses.json';
            
            console.log(`Fetching Dometrain courses from: ${url}`);
            
            // Add headers to avoid being blocked by servers
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*'
                }
            };
            
            const request = https.get(url, options, (res) => {
                console.log(`HTTP Response Status: ${res.statusCode}`);
                console.log(`HTTP Response Headers:`, res.headers);
                
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`Received ${data.length} bytes of data`);
                    
                    try {
                        if (res.statusCode === 200) {
                            console.log('Parsing JSON response...');
                            const courses: DometrainCourse[] = JSON.parse(data);
                            
                            if (!Array.isArray(courses)) {
                                console.error('Invalid response structure - expected array');
                                console.log('Response type:', typeof courses);
                                resolve(null);
                                return;
                            }
                            
                            console.log(`Successfully fetched ${courses.length} Dometrain courses`);
                            
                            // Log first course as sample
                            if (courses.length > 0) {
                                const sample = courses[0];
                                console.log('Sample course:', {
                                    id: sample.course_id,
                                    title: sample.course_title,
                                    hasAuthors: !!sample.author_names,
                                    authorCount: sample.author_names?.length || 0
                                });
                            }
                            
                            resolve(courses);
                        } else {
                            console.error(`Failed to fetch Dometrain courses: HTTP ${res.statusCode}`);
                            if (data.length < 1000) {
                                console.error('Response body:', data);
                            }
                            resolve(null);
                        }
                    } catch (error) {
                        console.error('Error parsing Dometrain courses JSON:', error);
                        console.error('First 500 chars of response:', data.substring(0, 500));
                        resolve(null);
                    }
                });
            });
            
            request.on('error', (error) => {
                console.error('Network error fetching Dometrain courses:', error);
                console.error('Error details:', {
                    message: error.message,
                    code: (error as any).code,
                    errno: (error as any).errno
                });
                resolve(null);
            });
            
            request.on('timeout', () => {
                console.error('Request timeout fetching Dometrain courses');
                request.destroy();
                resolve(null);
            });
            
            // Set timeout to 10 seconds
            request.setTimeout(10000);
        });
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
