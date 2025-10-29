import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { NEWSBLUR_PASSWORD_KEY } from './constants';

export interface BlogPost {
    title: string;
    link: string;
    description: string;
    pubDate: string; // For NewsBlur: this contains the shared_date, for RSS: this contains pubDate
    category: string;
    source: string;
    author: string;
}

// NewsBlur API response interfaces
interface NewsBlurStory {
    story_title: string;
    story_permalink: string;
    story_date: string;
    shared_date: string;
    story_authors: string;
    story_content?: string;
}

interface NewsBlurApiResponse {
    stories: NewsBlurStory[];
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

interface AuthorMapping {
    keyword: string;
    author: string;
}

interface AuthorMappingsConfig {
    urlContains: AuthorMapping[];
    authorContains: AuthorMapping[];
    authorExact: AuthorMapping[];
}

export class RSSBlogProvider implements vscode.TreeDataProvider<any> {
    private _onDidChangeTreeData: vscode.EventEmitter<any | undefined | null | void> = new vscode.EventEmitter<any | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<any | undefined | null | void> = this._onDidChangeTreeData.event;

    private posts: BlogPost[] = [];
    private categories: Map<string, BlogPost[]> = new Map();
    private categoriesConfig: CategoriesConfig | null = null;
    private authorMappingsConfig: AuthorMappingsConfig | null = null;
    private wholeWordRegexCache: Map<string, RegExp> = new Map(); // Cache for whole word regex patterns
    
    // Class-level constants
    private static readonly NEWSBLUR_RSS_PATTERN = /^https:\/\/[^.]+\.newsblur\.com\/social\/rss\/([^/]+)\/([^/]+)/;
    private static readonly NEWSBLUR_API_PATTERN = /^https:\/\/www\.newsblur\.com\/social\/stories\/([^/]+)\/([^/?]+)/;
    private static readonly MILLISECONDS_PER_MINUTE = 1000 * 60;
    private static readonly MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

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

    private async loadAuthorMappingsConfig(): Promise<void> {
        try {
            // Use extension context to get the correct path to authorMappings.json
            const authorMappingsPath = path.join(this.context.extensionPath, 'authorMappings.json');
            console.log(`Loading author mappings from: ${authorMappingsPath}`);
            const authorMappingsData = await fs.promises.readFile(authorMappingsPath, 'utf8');
            this.authorMappingsConfig = JSON.parse(authorMappingsData) as AuthorMappingsConfig;
            console.log(`✅ Author mappings configuration loaded successfully:`);
            console.log(`   - URL Contains: ${this.authorMappingsConfig.urlContains.length} mappings`);
            console.log(`   - Author Contains: ${this.authorMappingsConfig.authorContains.length} mappings`);
            console.log(`   - Author Exact: ${this.authorMappingsConfig.authorExact.length} mappings`);
        } catch (error) {
            console.error('❌ Error loading author mappings configuration:', error);
            console.error('This likely means authorMappings.json is missing from the extension package');
            // Fallback to empty config if file can't be loaded
            this.authorMappingsConfig = {
                urlContains: [],
                authorContains: [],
                authorExact: []
            };
            console.log('Using fallback configuration with empty author mappings');
        }
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
            
            // Display shared date for NewsBlur posts, otherwise fall back to source
            if (element.source === 'NewsBlur Shared Stories' && element.pubDate) {
                // Format the publication/shared date for display in local timezone
                try {
                    const sharedDate = new Date(element.pubDate);
                    if (!isNaN(sharedDate.getTime())) {
                        // The shared_date from NewsBlur is in UTC format: "2025-10-24 12:15:55.237000"
                        // Simply create a Date object and let JavaScript handle local timezone conversion
                        const utcDateString = element.pubDate;
                        
                        // Make sure it's treated as UTC by appending 'Z' if needed
                        const utcDate = new Date(utcDateString.includes('Z') ? utcDateString : utcDateString + 'Z');
                        
                        if (!isNaN(utcDate.getTime())) {
                            // JavaScript Date.prototype methods automatically convert to local timezone
                            const month = (utcDate.getMonth() + 1).toString().padStart(2, '0');
                            const day = utcDate.getDate().toString().padStart(2, '0');
                            const hours = utcDate.getHours().toString().padStart(2, '0');
                            const minutes = utcDate.getMinutes().toString().padStart(2, '0');
                            item.description = `${month}/${day} ${hours}:${minutes}`;
                        } else {
                            item.description = element.source;
                        }
                    } else {
                        item.description = element.source;
                    }
                } catch (error) {
                    item.description = element.source;
                }
            } else {
                item.description = element.source;
            }
            
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

    private async getNewsblurPassword(): Promise<string | undefined> {
        return await this.context.secrets.get(NEWSBLUR_PASSWORD_KEY);
    }

    private async setNewsblurPassword(password: string): Promise<void> {
        await this.context.secrets.store(NEWSBLUR_PASSWORD_KEY, password);
    }

    private async promptForNewsblurPassword(username: string): Promise<string | undefined> {
        const password = await vscode.window.showInputBox({
            prompt: `Enter NewsBlur password for user: ${username}`,
            password: true,
            placeHolder: 'Enter your NewsBlur password'
        });

        if (password) {
            await this.setNewsblurPassword(password);
            return password;
        }

        return undefined;
    }

    /**
     * Checks if NewsBlur API usage is configured (username, URL, enabled).
     * This method only checks configuration, not authentication readiness.
     */
    private isNewsBlurApiConfigured(useNewsblurApi: boolean, newsblurUsername: string, feedUrl: string): boolean {
        return useNewsblurApi && !!newsblurUsername && feedUrl.includes('newsblur.com');
    }

    /**
     * Checks if NewsBlur API can be used with the given credentials.
     * Requires both configuration and valid authentication.
     */
    private canUseNewsBlurApi(useNewsblurApi: boolean, newsblurUsername: string, feedUrl: string, newsblurPassword: string): boolean {
        return this.isNewsBlurApiConfigured(useNewsblurApi, newsblurUsername, feedUrl) && !!newsblurPassword;
    }

    private async loadFeeds(): Promise<void> {
        // Load categories configuration if not already loaded
        if (!this.categoriesConfig) {
            await this.loadCategoriesConfig();
        }

        // Load author mappings configuration if not already loaded
        if (!this.authorMappingsConfig) {
            await this.loadAuthorMappingsConfig();
        }

        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const feedUrl = config.get<string>('feedUrl') || 'https://alvinashcraft.newsblur.com/social/rss/109116/alvinashcraft';
        const recordCount = config.get<number>('recordCount') || 100;
        const useNewsblurApi = config.get<boolean>('useNewsblurApi') || false;
        const newsblurUsername = config.get<string>('newsblurUsername') || '';
        
        // Get password securely from SecretStorage
        let newsblurPassword = await this.getNewsblurPassword();
        
        console.log(`Loading feeds - clearing existing ${this.posts.length} posts`);
        this.posts = [];
        this.categories.clear();

        let posts: BlogPost[] = [];
        let usedNewsBlurApi = false;

        try {
            // Determine which method to use
            if (this.isNewsBlurApiConfigured(useNewsblurApi, newsblurUsername, feedUrl)) {
                // Prompt for password if not stored securely
                if (!newsblurPassword) {
                    newsblurPassword = await this.promptForNewsblurPassword(newsblurUsername);
                }

                if (newsblurPassword && this.canUseNewsBlurApi(useNewsblurApi, newsblurUsername, feedUrl, newsblurPassword)) {
                    console.log('Using NewsBlur API for enhanced access');
                    posts = await this.fetchNewsBlurApi(feedUrl, recordCount, newsblurUsername, newsblurPassword);
                    usedNewsBlurApi = true;
                    
                    // Note: Empty results (posts.length === 0) are not necessarily authentication failures.
                    // The API could legitimately return zero results if there are no new posts or if 
                    // date filtering excludes all posts. Only clear credentials on actual HTTP auth errors.
                    console.log(`NewsBlur API returned ${posts.length} posts`);
                    if (posts.length === 0) {
                        console.log('NewsBlur API returned no posts - this could be due to no new content, date filtering, or other factors');
                    }
                } else {
                    console.log('NewsBlur API enabled but no password provided, using RSS feed');
                    vscode.window.showInformationMessage('NewsBlur API cancelled. Using RSS feed (limited to ~25 items).');
                    
                    const urlWithParams = this.appendRecordCount(feedUrl, recordCount);
                    posts = await this.fetchFeed(urlWithParams);
                    usedNewsBlurApi = false;
                }
            } else {
                // Use traditional RSS approach
                if (useNewsblurApi && !newsblurUsername) {
                    console.warn('NewsBlur API enabled but username not configured, using RSS feed');
                    vscode.window.showWarningMessage('NewsBlur API is enabled but username not configured. Using RSS feed (limited to ~25 items).');
                }
                
                const urlWithParams = this.appendRecordCount(feedUrl, recordCount);
                posts = await this.fetchFeed(urlWithParams);
                usedNewsBlurApi = false;
            }
            
            console.log(`Fetched ${posts.length} posts from ${usedNewsBlurApi ? 'NewsBlur API' : 'RSS feed'}`);
            
            const filteredPosts = await this.filterPostsByDate(posts);
            console.log(`Filtered to ${filteredPosts.length} posts after date filtering`);
            this.posts.push(...filteredPosts);
            console.log(`Total posts after loading: ${this.posts.length}`);
        } catch (error) {
            console.error('Error loading feed:', error);
        }

        this.categorizePosts();
        this.applyAuthorMappings();
    }

    private async fetchFeed(feedUrl: string, redirectCount: number = 0): Promise<BlogPost[]> {
        const MAX_REDIRECTS = 5;
        
        // Prevent infinite redirect loops
        if (redirectCount > MAX_REDIRECTS) {
            console.error(`Error fetching RSS feed ${feedUrl}: Too many redirects (${redirectCount}). Possible redirect loop.`);
            return [];
        }
        
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            };

            https.get(feedUrl, options, (response) => {
                // Handle redirects
                if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    console.log(`Redirect ${redirectCount + 1}/${MAX_REDIRECTS}: ${feedUrl} -> ${response.headers.location}`);
                    return this.fetchFeed(response.headers.location, redirectCount + 1).then(resolve).catch(() => resolve([]));
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

    private async fetchNewsBlurApi(feedUrl: string, recordCount: number, username: string, password: string, redirectCount: number = 0): Promise<BlogPost[]> {
        // Convert RSS URL to API URL format
        // From: https://alvinashcraft.newsblur.com/social/rss/109116/alvinashcraft
        // To: /social/stories/109116/alvinashcraft
        // Use regex to extract the /social/rss/<user_id>/<username> part from any NewsBlur subdomain
        const match = feedUrl.match(RSSBlogProvider.NEWSBLUR_RSS_PATTERN);
        let apiPath: string;
        if (match) {
            apiPath = `/social/stories/${match[1]}/${match[2]}`;
        } else {
            console.error(`Invalid NewsBlur social RSS feed URL: ${feedUrl}`);
            return [];
        }
        const apiUrl = `https://www.newsblur.com${apiPath}?limit=${recordCount}`;
        
        return this.fetchNewsBlurApiUrl(apiUrl, feedUrl, recordCount, username, password, redirectCount, 0);
    }

    private async fetchNewsBlurApiUrl(apiUrl: string, originalFeedUrl: string, recordCount: number, username: string, password: string, redirectCount: number = 0, retryCount: number = 0): Promise<BlogPost[]> {
        const MAX_REDIRECTS = 5;
        const MAX_RETRIES = 1;
        
        // Prevent infinite redirect loops
        if (redirectCount > MAX_REDIRECTS) {
            console.error(`Error fetching NewsBlur API ${apiUrl}: Too many redirects (${redirectCount}). Possible redirect loop.`);
            return [];
        }
        
        return new Promise((resolve) => {
            console.log(`Fetching NewsBlur API: ${apiUrl}`);
            
            const auth = Buffer.from(`${username}:${password}`).toString('base64');
            const options = {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json'
                }
            };

            https.get(apiUrl, options, (response) => {
                // Handle redirects
                if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    console.log(`Redirect ${redirectCount + 1}/${MAX_REDIRECTS}: ${apiUrl} -> ${response.headers.location}`);
                    // Only follow redirect if it matches NewsBlur API URL pattern
                    const redirectUrl = response.headers.location;
                    if (redirectUrl.match(RSSBlogProvider.NEWSBLUR_API_PATTERN)) {
                        // Use the redirect URL directly without conversion round-trip
                        return this.fetchNewsBlurApiUrl(redirectUrl, originalFeedUrl, recordCount, username, password, redirectCount + 1, retryCount).then(resolve).catch(() => resolve([]));
                    } else {
                        console.error(`Redirected to non-NewsBlur API URL: ${redirectUrl}`);
                        resolve([]);
                        return;
                    }
                }

                // Check for 502 Bad Gateway and retry once
                if (response.statusCode === 502 && retryCount < MAX_RETRIES) {
                    console.log(`Received 502 Bad Gateway from NewsBlur API, retrying (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                    return this.fetchNewsBlurApiUrl(apiUrl, originalFeedUrl, recordCount, username, password, redirectCount, retryCount + 1).then(resolve).catch(() => resolve([]));
                }

                // Check for successful response
                if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
                    console.error(`Error fetching NewsBlur API ${apiUrl}: HTTP ${response.statusCode}`);
                    resolve([]);
                    return;
                }

                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        const apiResponse: NewsBlurApiResponse = JSON.parse(data);
                        const posts = this.parseNewsBlurApiResponse(apiResponse, originalFeedUrl);
                        console.log(`NewsBlur API returned ${posts.length} stories`);
                        resolve(posts);
                    } catch (error) {
                        console.error(`Error parsing NewsBlur API response:`, error);
                        resolve([]);
                    }
                });
            }).on('error', (error) => {
                console.error(`Error fetching NewsBlur API ${apiUrl}:`, error);
                resolve([]);
            });
        });
    }


    private parseNewsBlurApiResponse(apiResponse: NewsBlurApiResponse, feedUrl: string): BlogPost[] {
        const posts: BlogPost[] = [];
        const seenLinks = new Set<string>(); // Track duplicate links
        
        if (!apiResponse.stories || !Array.isArray(apiResponse.stories)) {
            console.warn('No stories found in NewsBlur API response');
            return posts;
        }

        const feedTitle = 'NewsBlur Shared Stories';
        console.log(`Processing ${apiResponse.stories.length} stories from NewsBlur API`);

        apiResponse.stories.forEach((story: NewsBlurStory, index: number) => {
            try {
                const title = story.story_title || 'Untitled';
                const link = story.story_permalink || '';
                const description = story.story_content ? this.stripHtml(story.story_content) : '';
                
                // NewsBlur returns Unix timestamps (seconds since epoch) as strings
                // Convert to ISO format for consistent date handling
                // NOTE: We prioritize shared_date (when you shared the post) over story_date (when it was published)
                let pubDate = '';
                const rawDate = story.shared_date || story.story_date || '';
                if (rawDate) {
                    // Check if it's a Unix timestamp (all digits) vs ISO string
                    if (/^\d+$/.test(rawDate)) {
                        // Unix timestamp - convert to ISO string
                        const timestamp = parseInt(rawDate, 10);
                        pubDate = new Date(timestamp * 1000).toISOString();
                    } else {
                        // NewsBlur returns dates in UTC format like "2025-10-27 06:09:00.237000"
                        // but without the 'Z' timezone indicator. We need to add it so JavaScript
                        // treats it as UTC instead of local time.
                        // Check for timezone info: 'Z' at end or offset like '+hh:mm' or '-hh:mm'
                        if (/(Z$|[+-]\\d{2}:\\d{2}$)/.test(rawDate)) {
                            // Already has timezone info
                            pubDate = rawDate;
                        } else if (/\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?/.test(rawDate)) {
                            // ISO 8601 format with 'T' separator but no timezone
                            // Handles timestamps with or without fractional seconds
                            // This is UTC from NewsBlur, add 'Z' indicator
                            pubDate = rawDate + 'Z';
                        } else {
                            // Plain date string without 'T' separator (NewsBlur format)
                            // Add 'Z' to indicate UTC timezone
                            pubDate = rawDate + 'Z';
                        }
                    }
                }
                
                let author = story.story_authors || 'unknown';
                
                // Clean up author - NewsBlur sometimes returns comma-separated authors
                // Format: 2 authors: "First & Second"
                // Format: 3+ authors: "First, Second & Third"
                if (author.includes(',')) {
                    const authors = author.split(',').map(a => a.trim()).filter(a => a.length > 0);
                    if (authors.length === 0) {
                        author = 'unknown';
                    } else if (authors.length === 1) {
                        author = authors[0];
                    } else if (authors.length === 2) {
                        author = `${authors[0]} & ${authors[1]}`;
                    } else {
                        const lastAuthor = authors[authors.length - 1];
                        const otherAuthors = authors.slice(0, -1);
                        author = `${otherAuthors.join(', ')} & ${lastAuthor}`;
                    }
                }
                
                // Clean up and validate author
                author = author ? author.trim() : '';
                if (!author || 
                    author === '' || 
                    author.toLowerCase().includes('blurblog') ||
                    author.includes('[object Object]') ||
                    author === feedTitle ||
                    author.length > 100) {
                    author = 'unknown';
                }

                const post: BlogPost = {
                    title: title,
                    link: this.appendSyncfusionTracking(this.removeTrackingParameters(link)),
                    description: description,
                    pubDate: pubDate, // For NewsBlur, this already contains the shared_date
                    category: this.categorizePost(title, description, link),
                    source: feedTitle,
                    author: author
                };
                
                this.addPostIfNotDuplicate(post, posts, seenLinks);
            } catch (itemError) {
                console.error(`Error processing NewsBlur story ${index}:`, itemError);
                // Continue with next story instead of failing completely
            }
        });

        return posts;
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
                        link: this.appendSyncfusionTracking(this.removeTrackingParameters(link)),
                        description: this.stripHtml(description),
                        pubDate: item.pubDate || item.published || item.updated || '',
                        category: this.categorizePost(title, description, link),
                        source: feedTitle,
                        author: author
                    };
                    
                    this.addPostIfNotDuplicate(post, posts, seenLinks);
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
     * Categorizes a blog post based on keyword matching in the following global priority order:
     *   1. URL keyword matching (most reliable) - checked across ALL categories first
     *   2. Title keyword matching - checked across ALL categories second  
     *   3. (Future) Author keyword matching - would be checked across ALL categories third
     * 
     * This ensures URL matches always take precedence over title matches, regardless of category order.
     * For example, a YouTube link will always be categorized as "Videos" even if the title matches 
     * "Web Development" keywords and "Web Development" appears first in the configuration.
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

        // Two-pass approach to ensure URL keywords always take precedence over title keywords
        // Pass 1: Check URL keywords across ALL categories first (highest priority)
        for (const [category, categoryDef] of Object.entries(this.categoriesConfig.categories)) {
            const normalizedDef = this.normalizeCategoryDefinition(categoryDef);
            
            if (normalizedDef.urlKeywords) {
                for (const urlKeyword of normalizedDef.urlKeywords) {
                    if (urlLower.includes(urlKeyword.toLowerCase())) {
                        console.log(`Post "${title}" categorized as "${category}" due to URL keyword: "${urlKeyword}" (URL match)`);
                        return category;
                    }
                }
            }
        }
        
        // Pass 2: If no URL match found, check title keywords across ALL categories
        for (const [category, categoryDef] of Object.entries(this.categoriesConfig.categories)) {
            const normalizedDef = this.normalizeCategoryDefinition(categoryDef);
            
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
        }
        
        // Pass 3: Future - Author keyword matching could be added here
        // for (const [category, categoryDef] of Object.entries(this.categoriesConfig.categories)) {
        //     const normalizedDef = this.normalizeCategoryDefinition(categoryDef);
        //     if (normalizedDef.authorKeywords) { ... }
        // }

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

    private applyAuthorMappings(): void {
        if (!this.authorMappingsConfig) {
            console.log('❌ Author mappings not loaded, skipping author name updates');
            return;
        }

        // Store config in local variable to avoid repeated property access and ensure type safety
        const config = this.authorMappingsConfig;

        let updatedCount = 0;
        const totalPosts = this.posts.length;

        console.log(`🔍 Applying author mappings to ${totalPosts} posts...`);

        // Apply mappings to each post
        this.posts.forEach(post => {
            const originalAuthor = post.author;
            let newAuthor = originalAuthor;

            // 1. URL Contains mappings (highest priority)
            const urlLower = post.link.toLowerCase();
            for (const mapping of config.urlContains) {
                if (urlLower.includes(mapping.keyword.toLowerCase())) {
                    newAuthor = mapping.author;
                    console.log(`✅ URL mapping applied: "${originalAuthor}" → "${newAuthor}" (URL contains "${mapping.keyword}")`);
                    break; // Stop at first match for efficiency
                }
            }

            // 2. Author Contains mappings (medium priority, only if no URL match)
            if (newAuthor === originalAuthor) {
                const authorLower = originalAuthor.toLowerCase();
                for (const mapping of config.authorContains) {
                    if (authorLower.includes(mapping.keyword.toLowerCase())) {
                        newAuthor = mapping.author;
                        console.log(`✅ Author contains mapping applied: "${originalAuthor}" → "${newAuthor}" (author contains "${mapping.keyword}")`);
                        break; // Stop at first match for efficiency
                    }
                }
            }

            // 3. Author Exact mappings (lowest priority, only if no other matches)
            if (newAuthor === originalAuthor) {
                const authorLower = originalAuthor.toLowerCase();
                for (const mapping of config.authorExact) {
                    if (authorLower === mapping.keyword.toLowerCase()) {
                        newAuthor = mapping.author;
                        console.log(`✅ Author exact mapping applied: "${originalAuthor}" → "${newAuthor}" (exact match "${mapping.keyword}")`);
                        break; // Stop at first match for efficiency
                    }
                }
            }

            // Update the post author if a mapping was found
            if (newAuthor !== originalAuthor) {
                post.author = newAuthor;
                updatedCount++;
            }
        });

        console.log(`📝 Author mappings complete: ${updatedCount} of ${totalPosts} posts had author names updated`);
    }

    private appendRecordCount(feedUrl: string, recordCount: number): string {
        const url = new URL(feedUrl);
        url.searchParams.set('n', recordCount.toString());
        return url.toString();
    }

    /**
     * Filters posts by date, prioritizing shared dates over publication dates.
     * For NewsBlur API data, this uses the shared_date (when you shared the post).
     * For RSS feeds, this uses the pubDate from the feed.
     * Posts with invalid dates are included (better to include than exclude).
     */
    private async filterPostsByDate(posts: BlogPost[]): Promise<BlogPost[]> {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const minimumDateTimeStr = config.get<string>('minimumDateTime') || '';
        
        let minimumDateTime: Date;
        
        if (minimumDateTimeStr.trim() === '') {
            // Try to use the date of the latest "Dew Drop" post from Alvin's blog
            const lastDewDropDate = await this.getLastDewDropDate();
            
            if (lastDewDropDate) {
                // Get buffer configuration settings (reuse existing config)
                const enableBuffer = config.get<boolean>('enablePostFilteringBuffer', true);
                const bufferMinutes = config.get<number>('postFilteringBufferMinutes', 5);
                
                if (enableBuffer && bufferMinutes > 0) {
                    // Add configurable buffer to account for timing differences
                    minimumDateTime = new Date(lastDewDropDate.getTime() + (bufferMinutes * RSSBlogProvider.MILLISECONDS_PER_MINUTE));
                    console.log(`Using latest Dew Drop post date as filter (with ${bufferMinutes}min buffer): posts newer than ${minimumDateTime.toISOString()}`);
                } else {
                    // No buffer - use exact Dew Drop date
                    minimumDateTime = new Date(lastDewDropDate.getTime());
                    console.log(`Using latest Dew Drop post date as filter (no buffer): posts newer than ${minimumDateTime.toISOString()}`);
                }
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
            // If there's no date at all, we have to exclude it
            if (!post.pubDate || post.pubDate.trim() === '') {
                console.log(`Excluding post "${post.title}" - no date available`);
                return false;
            }
            
            try {
                const postDate = new Date(post.pubDate);
                
                // If we can't parse the date, include the post anyway (better to include than exclude)
                if (isNaN(postDate.getTime())) {
                    console.log(`Including post "${post.title}" despite invalid date format: "${post.pubDate}" - assuming it's recent`);
                    return true;
                }
                
                // Check if post is too old (before minimum date)
                const isTooOld = postDate <= minimumDateTime;
                if (isTooOld) {
                    const timeDiffMinutes = Math.round((minimumDateTime.getTime() - postDate.getTime()) / RSSBlogProvider.MILLISECONDS_PER_MINUTE);
                    console.log(`Excluding post "${post.title}" - too old by ${timeDiffMinutes} minutes: ${postDate.toISOString()} <= ${minimumDateTime.toISOString()}`);
                    return false;
                }
                
                return true; // Post is within acceptable date range
            } catch (error) {
                // If there's any error parsing the date, include the post anyway
                console.log(`Including post "${post.title}" despite date parsing error: ${error} - assuming it's recent`);
                return true;
            }
        });

        console.log(`Date filtering: ${filteredPosts.length} of ${posts.length} posts passed the date filter (newer than ${minimumDateTime.toISOString()})`);
        return filteredPosts;
    }

    /**
     * Removes common tracking parameters from URLs to clean them up.
     * Common tracking parameters include: utm_*, fbclid, gclid, mc_*, ref, source, campaign, etc.
     * 
     * @param url - The URL to clean
     * @returns The URL with tracking parameters removed
     */
    private removeTrackingParameters(url: string): string {
        try {
            const urlObj = new URL(url);
            
            // List of common tracking parameter patterns
            const trackingParams = [
                // UTM parameters (Google Analytics, marketing campaigns)
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
                // Facebook
                'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source',
                // Google
                'gclid', 'gclsrc', 'dclid',
                // MailChimp
                'mc_cid', 'mc_eid',
                // Other common tracking
                'ref', 'referer', 'referrer', 'source', 'campaign',
                // Microsoft/Bing
                'msclkid',
                // Twitter
                'twclid',
                // LinkedIn
                'trk', 'trkInfo',
                // Reddit
                'rdt_cid',
                // HubSpot
                'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src', 'hsa_tgt', 'hsa_kw', 'hsa_mt', 'hsa_net', 'hsa_ver',
                // Adobe/Omniture
                'WT.mc_id', 'icid'
            ];
            
            // Remove tracking parameters
            trackingParams.forEach(param => {
                urlObj.searchParams.delete(param);
            });
            
            const cleanedUrl = urlObj.toString();
            
            // Only log if we actually removed something
            if (cleanedUrl !== url) {
                console.log(`🧹 Cleaned tracking from URL: ${url} → ${cleanedUrl}`);
            }
            
            return cleanedUrl;

        } catch (error) {
            console.error('Error removing tracking parameters:', error);
            return url; // Return original URL if there's an error
        }
    }

    /**
     * Appends tracking parameters to Syncfusion URLs.
     * Tracking format: ?utm_source=alvinashcraft&utm_medium=email&utm_campaign=alvinashcraft_blog_edm{MMMYY}
     * Example for October 2025: ?utm_source=alvinashcraft&utm_medium=email&utm_campaign=alvinashcraft_blog_edmoct25
     * 
     * @param url - The URL to potentially modify
     * @returns The URL with tracking parameters if it's a Syncfusion URL, otherwise the original URL
     */
    private appendSyncfusionTracking(url: string): string {
        try {
            // Check if this is a Syncfusion URL
            if (!url.toLowerCase().includes('syncfusion.com')) {
                return url;
            }

            // Generate the month/year suffix (MMMYY format)
            const now = new Date();
            const monthSuffix = RSSBlogProvider.MONTH_NAMES[now.getMonth()];
            const yearSuffix = now.getFullYear().toString().slice(-2); // Last 2 digits of year
            const campaignSuffix = `${monthSuffix}${yearSuffix}`; // e.g., "oct25"

            // Build the tracking parameters
            const trackingParams = `utm_source=alvinashcraft&utm_medium=email&utm_campaign=alvinashcraft_blog_edm${campaignSuffix}`;

            // Parse the URL to add tracking parameters properly
            const urlObj = new URL(url);
            
            // Check if URL already has query parameters
            if (urlObj.search) {
                // Append to existing parameters
                urlObj.search += `&${trackingParams}`;
            } else {
                // Add as new parameters
                urlObj.search = `?${trackingParams}`;
            }

            const trackedUrl = urlObj.toString();
            console.log(`✅ Added Syncfusion tracking: ${url} → ${trackedUrl}`);
            return trackedUrl;

        } catch (error) {
            console.error('Error adding Syncfusion tracking parameters:', error);
            return url; // Return original URL if there's an error
        }
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

    /**
     * Adds a post to the posts array if it's valid and not a duplicate.
     * @param post The blog post to potentially add
     * @param posts The array to add the post to
     * @param seenLinks Set of already seen links for duplicate detection
     */
    private addPostIfNotDuplicate(post: BlogPost, posts: BlogPost[], seenLinks: Set<string>): void {
        if (post.title && post.link) {
            // Check for duplicate links
            if (seenLinks.has(post.link)) {
                console.log(`Duplicate link found, skipping: ${post.link}`);
                return;
            }
            
            seenLinks.add(post.link);
            posts.push(post);
        }
        
        // Log when posts are skipped due to missing title or link
        if (!post.title && !post.link) {
            console.warn(`Skipping post with missing title and link from source: ${post.source || 'unknown'}`);
        } else if (!post.title) {
            console.warn(`Skipping post with missing title: ${post.link} from source: ${post.source || 'unknown'}`);
        } else if (!post.link) {
            console.warn(`Skipping post with missing link: "${post.title}" from source: ${post.source || 'unknown'}`);
        }
    }
}