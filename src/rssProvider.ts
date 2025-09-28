import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';

export interface BlogPost {
    title: string;
    link: string;
    description: string;
    pubDate: string;
    category: string;
    source: string;
    author: string;
}

export interface CategoryNode {
    label: string;
    posts: BlogPost[];
    collapsibleState: vscode.TreeItemCollapsibleState;
}

interface CategoryDefinition {
    urlKeywords?: string[];
    titleKeywords?: string[];
    authorKeywords?: string[];
}

interface CategoriesConfig {
    categories: Record<string, string[] | CategoryDefinition>;
    defaultCategory: string;
    wholeWordKeywords?: string[]; // Optional list of keywords that require whole word matching
}

export class RSSBlogProvider implements vscode.TreeDataProvider<any> {
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined | null | void> = new vscode.EventEmitter<any | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<any | undefined | null | void> = this._onDidChangeTreeData.event;

    private posts: BlogPost[] = [];
    private categories: Map<string, BlogPost[]> = new Map();
    private categoriesConfig: CategoriesConfig | null = null;
    private wholeWordRegexCache: Map<string, RegExp> = new Map(); // Cache for whole word regex patterns

    constructor(private context: vscode.ExtensionContext) {}

    private async getLastDewDropDate(): Promise<Date | null> {
        try {
            console.log('Fetching latest Dew Drop post date from Alvin\'s blog...');
            const posts = await this.fetchFeed('https://www.alvinashcraft.com/feed/');
            
            if (posts.length === 0) {
                console.log('No posts found in blog RSS feed');
                return null;
            }
            
            // Find the most recent post with title starting with "Dew D"
            // Handle HTML entities in titles (like &#8211; for em-dash)
            const dewDropPosts = posts.filter(post => {
                const cleanTitle = post.title.toLowerCase()
                    .replace(/&#8211;/g, '-')  // em-dash
                    .replace(/&#8212;/g, '-')  // em-dash variant
                    .replace(/&[a-z]+;/g, '')  // other HTML entities
                    .trim();
                return cleanTitle.startsWith('dew d');
            });
            
            if (dewDropPosts.length === 0) {
                console.log('No Dew Drop posts found in blog RSS feed (searched in first 20 posts)');
                console.log('Available post titles:', posts.slice(0, 5).map(p => `"${p.title}"`).join(', '));
                return null;
            }

            // Posts should already be sorted by date (newest first) from RSS feed
            // But let's sort them to be sure
            dewDropPosts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
            
            const latestDewDrop = dewDropPosts[0];
            const latestDate = new Date(latestDewDrop.pubDate);
            
            if (isNaN(latestDate.getTime())) {
                console.log('Invalid date found in latest Dew Drop post');
                return null;
            }

            console.log(`✅ Latest Dew Drop post found: "${latestDewDrop.title}" from ${latestDate.toISOString()}`);
            return latestDate;
        } catch (error) {
            console.error('❌ Error fetching latest Dew Drop date:', error);
            return null;
        }
    }

    private async loadCategoriesConfig(): Promise<void> {
        try {
            // Use extension context to get the correct path to categories.json
            const categoriesPath = path.join(this.context.extensionPath, 'categories.json');
            console.log(`Loading categories from: ${categoriesPath}`);
            const categoriesData = await fs.promises.readFile(categoriesPath, 'utf8');
            this.categoriesConfig = JSON.parse(categoriesData) as CategoriesConfig;
            console.log(`✅ Categories configuration loaded successfully with ${Object.keys(this.categoriesConfig.categories).length} categories`);
            
            // Initialize regex cache for whole word keywords
            this.initializeWholeWordRegexCache();
        } catch (error) {
            console.error('❌ Error loading categories configuration:', error);
            console.error('This likely means categories.json is missing from the extension package');
            // Fallback to empty config if file can't be loaded
            this.categoriesConfig = {
                categories: {},
                defaultCategory: 'General',
                wholeWordKeywords: []
            };
            console.log('Using fallback configuration with empty categories');
        }
    }

    private initializeWholeWordRegexCache(): void {
        // Clear existing cache
        this.wholeWordRegexCache.clear();
        
        // Create regex patterns for whole word keywords
        if (this.categoriesConfig?.wholeWordKeywords) {
            const validKeywords = this.categoriesConfig.wholeWordKeywords
                .filter((keyword) => this.isValidKeyword(keyword))
                .map(keyword => keyword.toLowerCase());
                
            for (const keywordLower of validKeywords) {
                try {
                    // Use comprehensive regex escaping to prevent injection
                    const escapedKeyword = this.escapeRegexCharacters(keywordLower);
                    // No 'i' flag needed since both keyword and titleContent are already lowercase
                    const regex = new RegExp(`\\b${escapedKeyword}\\b`);
                    this.wholeWordRegexCache.set(keywordLower, regex);
                } catch (error) {
                    console.warn(`⚠️ Failed to create regex for keyword "${keywordLower}":`, error);
                    // Continue with other keywords instead of failing completely
                }
            }
            console.log(`✅ Initialized ${this.wholeWordRegexCache.size} whole word regex patterns`);
        }
    }

    private isValidKeyword(keyword: string): boolean {
        // Validate that keyword is a non-empty string with meaningful content
        if (typeof keyword !== 'string') {
            console.warn(`⚠️ Invalid keyword type: ${typeof keyword}, expected string`);
            return false;
        }
        
        const trimmed = keyword.trim();
        if (trimmed.length === 0) {
            console.warn(`⚠️ Empty or whitespace-only keyword ignored`);
            return false;
        }
        
        // Additional validation: keywords should be reasonable length
        if (trimmed.length > 100) {
            console.warn(`⚠️ Keyword too long (${trimmed.length} chars): "${trimmed.substring(0, 20)}..."`);
            return false;
        }
        
        return true;
    }

    private escapeRegexCharacters(text: string): string {
        // Comprehensive regex escaping to prevent injection attacks
        // This escapes all characters that have special meaning in regex
        return text.replace(/[\\^$.*+?()[\]{}|`/-]/g, '\\$&');
    }

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
        // Load categories configuration if not already loaded
        if (!this.categoriesConfig) {
            await this.loadCategoriesConfig();
        }

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
            const filteredPosts = await this.filterPostsByDate(posts);
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
                    
                    // Handle author that might be in different formats
                    let author = '';
                    try {
                        if (item.author) {
                            if (typeof item.author === 'string') {
                                author = item.author;
                            } else if (item.author.name) {
                                author = typeof item.author.name === 'string' ? item.author.name : '';
                            } else if (item.author['#text']) {
                                author = typeof item.author['#text'] === 'string' ? item.author['#text'] : '';
                            }
                        } else if (item['dc:creator']) {
                            author = typeof item['dc:creator'] === 'string' ? item['dc:creator'] : '';
                        }
                    } catch (error) {
                        console.log(`Error parsing author for post "${title}":`, error);
                        author = '';
                    }
                    
                    // Clean up and validate author
                    author = author ? author.trim() : '';
                    
                    // Check for problematic values and default to "unknown"
                    if (!author || 
                        author === '' || 
                        author.toLowerCase().includes('blurblog') ||
                        author.includes('[object Object]') ||
                        author === feedTitle ||
                        author.length > 100) { // Sanity check for overly long author names
                        author = 'unknown';
                    }
                    
                    const post: BlogPost = {
                        title: title,
                        link: link,
                        description: this.stripHtml(description),
                        pubDate: item.pubDate || item.published || item.updated || '',
                        category: this.categorizePost(title, description, link),
                        source: feedTitle,
                        author: author
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

    /**
     * Categorizes a blog post based on keyword matching in the following priority order:
     *   1. URL keyword matching (most reliable)
     *   2. Title keyword matching
     *   3. (Future) Author keyword matching
     * 
     * The first matching category is returned; if no match is found, the default category is used.
     * 
     * @param title - The title of the blog post.
     * @param description - The description of the blog post (currently unused).
     * @param url - The URL of the blog post (optional, defaults to empty string for backwards compatibility).
     * @returns The matched category name, or the default category if no match is found.
     */
    private categorizePost(title: string, description: string, url: string = ''): string {
        const titleContent = title.toLowerCase();
        const urlLower = url.toLowerCase();
        
        // Use loaded categories configuration
        if (!this.categoriesConfig) {
            console.warn('❌ Categories configuration not loaded, using default category "General"');
            return 'General';
        }

        // Check if categories are actually loaded
        if (Object.keys(this.categoriesConfig.categories).length === 0) {
            console.warn('⚠️ No categories found in configuration, using default category "General"');
            return this.categoriesConfig.defaultCategory;
        }

        // Iterate through categories in the order they appear in the JSON file
        // The first matching category wins - no further categories are checked
        for (const [category, categoryDef] of Object.entries(this.categoriesConfig.categories)) {
            // Normalize category definition (backwards compatibility)
            const normalizedDef = this.normalizeCategoryDefinition(categoryDef);
            
            // 1. First priority: URL keyword matching (most reliable)
            if (normalizedDef.urlKeywords) {
                for (const urlKeyword of normalizedDef.urlKeywords) {
                    if (urlLower.includes(urlKeyword.toLowerCase())) {
                        console.log(`Post "${title}" categorized as "${category}" due to URL keyword: "${urlKeyword}" (URL match)`);
                        return category;
                    }
                }
            }
            
            // 2. Second priority: Title keyword matching (existing logic)
            if (normalizedDef.titleKeywords) {
                for (const keyword of normalizedDef.titleKeywords) {
                    const keywordLower = keyword.toLowerCase();
                    
                    // Check if this keyword requires whole word matching
                    const cachedRegex = this.wholeWordRegexCache.get(keywordLower);
                    if (cachedRegex) {
                        // Use cached regex for whole word matching
                        if (cachedRegex.test(titleContent)) {
                            console.log(`Post "${title}" categorized as "${category}" due to title keyword: "${keyword}" (whole word match)`);
                            return category;
                        }
                    } else {
                        // Use substring matching for regular keywords
                        if (titleContent.includes(keywordLower)) {
                            console.log(`Post "${title}" categorized as "${category}" due to title keyword: "${keyword}" (substring match)`);
                            return category;
                        }
                    }
                }
            }
            
            // 3. Future: Author keyword matching could be added here
            // if (normalizedDef.authorKeywords) { ... }
        }

        // No category matched, use the default
        console.log(`Post "${title}" categorized as default: "${this.categoriesConfig.defaultCategory}" (no keywords matched)`);
        return this.categoriesConfig.defaultCategory;
    }

    /**
     * Normalizes a category definition to the current object structure.
     *
     * Legacy format: string[] - an array of keywords (e.g., ["ai", "ml", "data"]).
     * New format: CategoryDefinition - an object with properties such as titleKeywords.
     *
     * This method ensures backwards compatibility by converting legacy array definitions
     * to the new object format. Use this whenever category definitions may be in either format.
     *
     * @param categoryDef The category definition, either as a legacy string array or a CategoryDefinition object.
     * @returns A normalized CategoryDefinition object.
     */
    private normalizeCategoryDefinition(categoryDef: string[] | CategoryDefinition): CategoryDefinition {
        // Backwards compatibility: convert array format to object format
        if (Array.isArray(categoryDef)) {
            return {
                titleKeywords: categoryDef
            };
        }
        return categoryDef;
    }

    private categorizePosts(): void {
        this.categories.clear();
        
        // Initialize all categories from configuration, even if they will be empty
        if (this.categoriesConfig?.categories) {
            for (const categoryName of Object.keys(this.categoriesConfig.categories)) {
                this.categories.set(categoryName, []);
            }
            
            // Also ensure the default category exists
            if (!this.categories.has(this.categoriesConfig.defaultCategory)) {
                this.categories.set(this.categoriesConfig.defaultCategory, []);
            }
        }
        
        // Populate categories with posts
        this.posts.forEach(post => {
            const category = post.category;
            if (!this.categories.has(category)) {
                // This handles any unexpected categories not in the configuration
                this.categories.set(category, []);
                console.warn(`WARNING: Post assigned to unconfigured category: "${category}"`);
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

    private async filterPostsByDate(posts: BlogPost[]): Promise<BlogPost[]> {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const minimumDateTimeStr = config.get<string>('minimumDateTime') || '';
        
        let minimumDateTime: Date;
        
        if (minimumDateTimeStr.trim() === '') {
            // Try to use the date of the latest "Dew Drop" post from Alvin's blog
            const lastDewDropDate = await this.getLastDewDropDate();
            
            if (lastDewDropDate) {
                minimumDateTime = lastDewDropDate;
                console.log(`Using latest Dew Drop post date as filter: posts newer than ${minimumDateTime.toISOString()}`);
            } else {
                // Fallback to last 24 hours in UTC if we can't get the Dew Drop date
                minimumDateTime = new Date();
                minimumDateTime.setUTCHours(minimumDateTime.getUTCHours() - 24);
                console.log(`Could not fetch Dew Drop date, using default UTC filter: posts newer than ${minimumDateTime.toISOString()}`);
            }
        } else {
            try {
                minimumDateTime = new Date(minimumDateTimeStr);
                if (isNaN(minimumDateTime.getTime())) {
                    // Invalid date, fall back to 24 hours UTC
                    minimumDateTime = new Date();
                    minimumDateTime.setUTCHours(minimumDateTime.getUTCHours() - 24);
                    console.warn(`Invalid minimumDateTime format: "${minimumDateTimeStr}". Using default UTC filter: ${minimumDateTime.toISOString()}`);
                } else {
                    console.log(`Using custom UTC filter: posts newer than ${minimumDateTime.toISOString()}`);
                }
            } catch (error) {
                // Invalid date, fall back to 24 hours UTC
                minimumDateTime = new Date();
                minimumDateTime.setUTCHours(minimumDateTime.getUTCHours() - 24);
                console.warn(`Error parsing minimumDateTime: "${minimumDateTimeStr}". Using default UTC filter: ${minimumDateTime.toISOString()}`);
            }
        }

        const filteredPosts = posts.filter(post => {
            if (!post.pubDate) {
                console.log(`Excluding post "${post.title}" - no publication date`);
                return false; // Exclude posts without dates
            }
            
            try {
                const postDate = new Date(post.pubDate);
                if (isNaN(postDate.getTime())) {
                    console.log(`Excluding post "${post.title}" - invalid date format: "${post.pubDate}"`);
                    return false; // Exclude posts with invalid dates
                }
                
                const isIncluded = postDate >= minimumDateTime;
                if (!isIncluded) {
                    console.log(`Excluding post "${post.title}" - too old: ${postDate.toISOString()} < ${minimumDateTime.toISOString()}`);
                }
                return isIncluded;
            } catch (error) {
                console.log(`Excluding post "${post.title}" - date parsing error: ${error}`);
                return false; // Exclude posts with invalid dates
            }
        });

        console.log(`Date filtering: ${filteredPosts.length} of ${posts.length} posts passed the UTC date filter`);
        return filteredPosts;
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