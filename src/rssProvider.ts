import * as vscode from 'vscode';
import * as https from 'https';
import { XMLParser } from 'fast-xml-parser';

export interface BlogPost {
    title: string;
    link: string;
    description: string;
    pubDate: string;
    category: string;
    source: string;
}

export interface CategoryNode {
    label: string;
    posts: BlogPost[];
    collapsibleState: vscode.TreeItemCollapsibleState;
}

export class RSSBlogProvider implements vscode.TreeDataProvider<any> {
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined | null | void> = new vscode.EventEmitter<any | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<any | undefined | null | void> = this._onDidChangeTreeData.event;

    private posts: BlogPost[] = [];
    private categories: Map<string, BlogPost[]> = new Map();

    constructor(private context: vscode.ExtensionContext) {}

    async refresh(): Promise<void> {
        await this.loadFeeds();
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: any): vscode.TreeItem {
        if (element.posts) {
            // Category node
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Expanded);
            item.tooltip = `${element.posts.length} posts`;
            item.contextValue = 'category';
            return item;
        } else {
            // Blog post node
            const item = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.None);
            item.tooltip = element.description;
            item.description = element.source;
            item.command = {
                command: 'rssBlogCategorizer.openPost',
                title: 'Open Post',
                arguments: [element]
            };
            item.contextValue = 'post';
            return item;
        }
    }

    getChildren(element?: any): Thenable<any[]> {
        if (!element) {
            // Return categories
            const categoryNodes: CategoryNode[] = [];
            this.categories.forEach((posts, category) => {
                categoryNodes.push({
                    label: `${category} (${posts.length})`,
                    posts: posts,
                    collapsibleState: vscode.TreeItemCollapsibleState.Expanded
                });
            });
            return Promise.resolve(categoryNodes);
        } else if (element.posts) {
            // Return posts in category
            return Promise.resolve(element.posts);
        }
        return Promise.resolve([]);
    }

    async getAllPosts(): Promise<BlogPost[]> {
        return this.posts;
    }

    async setFeedUrl(feedUrl: string): Promise<void> {
        // Validate URL before saving
        try {
            new URL(feedUrl);
        } catch (error) {
            throw new Error('Invalid URL format');
        }
        
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        await config.update('feedUrl', feedUrl, vscode.ConfigurationTarget.Global);
        // Refresh will be called by the command handler
    }

    private async loadFeeds(): Promise<void> {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const feedUrl = config.get<string>('feedUrl') || 'https://alvinashcraft.newsblur.com/social/rss/109116/alvinashcraft';
        const recordCount = config.get<number>('recordCount') || 100;
        
        console.log(`Loading feeds - clearing existing ${this.posts.length} posts`);
        this.posts = [];
        this.categories.clear();

        try {
            // Append record count parameter to URL
            const urlWithParams = this.appendRecordCount(feedUrl, recordCount);
            const posts = await this.fetchFeed(urlWithParams);
            console.log(`Fetched ${posts.length} posts from feed`);
            const filteredPosts = this.filterPostsByDate(posts);
            console.log(`Filtered to ${filteredPosts.length} posts after date filtering`);
            this.posts.push(...filteredPosts);
            console.log(`Total posts after loading: ${this.posts.length}`);
        } catch (error) {
            console.error('Error loading feed:', error);
        }

        this.categorizePosts();
    }

    private async fetchFeed(feedUrl: string): Promise<BlogPost[]> {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            };

            https.get(feedUrl, options, (response) => {
                // Handle redirects
                if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    return this.fetchFeed(response.headers.location).then(resolve).catch(() => resolve([]));
                }

                // Check for successful response
                if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
                    console.error(`Error fetching RSS feed ${feedUrl}: HTTP ${response.statusCode}`);
                    resolve([]);
                    return;
                }

                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        const parser = new XMLParser({
                            ignoreAttributes: false,
                            attributeNamePrefix: '@_'
                        });
                        
                        const result = parser.parse(data);
                        const posts = this.parseRSSFeed(result, feedUrl);
                        resolve(posts);
                    } catch (error) {
                        console.error(`Error parsing RSS feed ${feedUrl}:`, error);
                        resolve([]);
                    }
                });
            }).on('error', (error) => {
                console.error(`Error fetching RSS feed ${feedUrl}:`, error);
                resolve([]);
            });
        });
    }

    private parseRSSFeed(rssData: any, feedUrl: string): BlogPost[] {
        const posts: BlogPost[] = [];
        const seenLinks = new Set<string>(); // Track duplicate links
        
        try {
            // Handle both RSS and Atom feeds
            const channel = rssData.rss?.channel || rssData.feed;
            if (!channel) {
                console.warn('No RSS channel or Atom feed found in data');
                return posts;
            }

            const items = Array.isArray(channel.item) ? channel.item : 
                         channel.item ? [channel.item] : 
                         Array.isArray(channel.entry) ? channel.entry : 
                         channel.entry ? [channel.entry] : [];

            if (items.length === 0) {
                console.warn('No items/entries found in feed');
                return posts;
            }

            const feedTitle = channel.title || new URL(feedUrl).hostname;
            console.log(`Processing ${items.length} items from feed: ${feedTitle}`);

            items.forEach((item: any, index: number) => {
                let link = '';
                
                // Handle different link formats (RSS vs Atom)
                if (typeof item.link === 'string') {
                    link = item.link;
                } else if (item.link?.['@_href']) {
                    link = item.link['@_href'];
                } else if (Array.isArray(item.link)) {
                    // Atom feeds can have multiple links - prefer alternate
                    const alternateLink = item.link.find((l: any) => l['@_rel'] === 'alternate');
                    link = alternateLink?.['@_href'] || item.link[0]?.['@_href'] || '';
                } else if (item.link?.href) {
                    link = item.link.href;
                }

                try {
                    // Handle description/content that might be objects (Atom feeds)
                    let description = '';
                    if (item.description) {
                        description = typeof item.description === 'string' ? item.description : 
                                    item.description['#text'] || item.description._ || '';
                    } else if (item.summary) {
                        description = typeof item.summary === 'string' ? item.summary : 
                                    item.summary['#text'] || item.summary._ || '';
                    } else if (item.content) {
                        description = typeof item.content === 'string' ? item.content : 
                                    item.content['#text'] || item.content._ || '';
                    }
                    
                    // Handle title that might be an object
                    let title = '';
                    if (item.title) {
                        title = typeof item.title === 'string' ? item.title : 
                               item.title['#text'] || item.title._ || String(item.title) || 'Untitled';
                    } else {
                        title = 'Untitled';
                    }
                    
                    const post: BlogPost = {
                        title: title,
                        link: link,
                        description: this.stripHtml(description),
                        pubDate: item.pubDate || item.published || item.updated || '',
                        category: this.categorizePost(title, description),
                        source: feedTitle
                    };
                    
                    if (post.title && post.link) {
                        // Check for duplicate links
                        if (seenLinks.has(post.link)) {
                            console.log(`Duplicate link found, skipping: ${post.link}`);
                        } else {
                            seenLinks.add(post.link);
                            posts.push(post);
                        }
                    }
                } catch (itemError) {
                    console.error(`Error processing feed item ${index}:`, itemError);
                    console.error('Problematic item data:', JSON.stringify(item, null, 2));
                    // Continue with next item instead of failing completely
                }
            });
        } catch (error) {
            console.error('Error parsing RSS data:', error);
        }

        return posts;
    }

    private categorizePost(title: string, description: string): string {
        const content = (title + ' ' + description).toLowerCase();
        
        const categories = {
            'JavaScript': ['javascript', 'js', 'node.js', 'nodejs', 'npm', 'react', 'vue', 'angular', 'typescript'],
            'Python': ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
            'DevOps and Methodology': ['docker', 'kubernetes', 'ci/cd', 'deployment', 'terraform', 'agile', 'scrum', 'kanban', 'patterns'],
            'Web Development': ['html', 'css', 'frontend', 'backend', 'api', 'rest', 'graphql', 'azure', 'aws', 'gcp', 'webassembly', 'wasm'],
            'Mobile': ['ios', 'android', 'react native', 'flutter', 'swift', 'kotlin', '.net maui', 'jetpack compose'],
            'Data Science': ['machine learning', 'ai', 'data science', 'analytics', 'big data'],
            'Programming': ['algorithm', 'data structure', 'coding', 'programming', 'software'],
            'AI': ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'openai', 'perplexity', 'bard', 'claude', 'gemini', 'gpt', 'copilot', 'foundry local', 'windows ml'],
            '.NET': ['.net', 'c#', 'asp.net', 'blazor', 'entity framework', 'visual studio', 'f#'],
            'Terminal': ['bash', 'zsh', 'fish', 'terminal', 'cli', 'command line', 'powershell'],
            'Microsoft 365': ['microsoft 365', 'office 365', 'sharepoint', 'teams', 'onenote', 'outlook', 'microsoft graph', 'excel', 'onedrive'],
            'Database': ['sql', 'database', 'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'nosql', 'fabric', 'couchbase', 'ravendb'],
            'Tools': ['git', 'vscode', 'ide', 'editor', 'productivity']
        };

        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => content.includes(keyword))) {
                return category;
            }
        }

        return 'General';
    }

    private categorizePosts(): void {
        this.categories.clear();
        
        this.posts.forEach(post => {
            const category = post.category;
            if (!this.categories.has(category)) {
                this.categories.set(category, []);
            }
            this.categories.get(category)!.push(post);
        });

        // Sort posts in each category by date (newest first)
        this.categories.forEach(posts => {
            posts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        });
    }

    private appendRecordCount(feedUrl: string, recordCount: number): string {
        const url = new URL(feedUrl);
        url.searchParams.set('n', recordCount.toString());
        return url.toString();
    }

    private filterPostsByDate(posts: BlogPost[]): BlogPost[] {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const minimumDateTimeStr = config.get<string>('minimumDateTime') || '';
        
        let minimumDateTime: Date;
        
        if (minimumDateTimeStr.trim() === '') {
            // Default to last 24 hours
            minimumDateTime = new Date();
            minimumDateTime.setHours(minimumDateTime.getHours() - 24);
        } else {
            try {
                minimumDateTime = new Date(minimumDateTimeStr);
                if (isNaN(minimumDateTime.getTime())) {
                    // Invalid date, fall back to 24 hours
                    minimumDateTime = new Date();
                    minimumDateTime.setHours(minimumDateTime.getHours() - 24);
                }
            } catch (error) {
                // Invalid date, fall back to 24 hours
                minimumDateTime = new Date();
                minimumDateTime.setHours(minimumDateTime.getHours() - 24);
            }
        }

        return posts.filter(post => {
            if (!post.pubDate) {
                return false; // Exclude posts without dates
            }
            
            try {
                const postDate = new Date(post.pubDate);
                if (isNaN(postDate.getTime())) {
                    return false; // Exclude posts with invalid dates
                }
                return postDate >= minimumDateTime;
            } catch (error) {
                return false; // Exclude posts with invalid dates
            }
        });
    }

    private stripHtml(html: any): string {
        // Handle non-string inputs defensively
        if (!html) {
            return '';
        }
        
        // Convert to string if it's not already
        let htmlStr = '';
        if (typeof html === 'string') {
            htmlStr = html;
        } else if (typeof html === 'object') {
            // Handle XML parser objects that might have text content
            htmlStr = html['#text'] || html._ || html.toString() || '';
        } else {
            htmlStr = String(html);
        }
        
        if (!htmlStr) {
            return '';
        }
        
        try {
            // First decode HTML entities
            const decoded = htmlStr
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ');
            
            // Remove HTML tags more robustly
            const withoutTags = decoded
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags and content
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Remove style tags and content
                .replace(/<[^>]*>/g, '')                          // Remove all other HTML tags
                .replace(/\s+/g, ' ')                             // Normalize whitespace
                .trim();
            
            return withoutTags.substring(0, 200);
        } catch (error) {
            console.error('Error stripping HTML:', error, 'Input was:', html);
            return htmlStr.substring(0, 200);
        }
    }
}