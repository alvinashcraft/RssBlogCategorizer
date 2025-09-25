"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSSBlogProvider = void 0;
const vscode = require("vscode");
const https = require("https");
const fast_xml_parser_1 = require("fast-xml-parser");
class RSSBlogProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.posts = [];
        this.categories = new Map();
    }
    async refresh() {
        await this.loadFeeds();
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        if (element.posts) {
            // Category node
            const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Expanded);
            item.tooltip = `${element.posts.length} posts`;
            item.contextValue = 'category';
            return item;
        }
        else {
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
    getChildren(element) {
        if (!element) {
            // Return categories
            const categoryNodes = [];
            this.categories.forEach((posts, category) => {
                categoryNodes.push({
                    label: `${category} (${posts.length})`,
                    posts: posts,
                    collapsibleState: vscode.TreeItemCollapsibleState.Expanded
                });
            });
            return Promise.resolve(categoryNodes);
        }
        else if (element.posts) {
            // Return posts in category
            return Promise.resolve(element.posts);
        }
        return Promise.resolve([]);
    }
    async getAllPosts() {
        return this.posts;
    }
    async setFeedUrl(feedUrl) {
        // Validate URL before saving
        try {
            new URL(feedUrl);
        }
        catch (error) {
            throw new Error('Invalid URL format');
        }
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        await config.update('feedUrl', feedUrl, vscode.ConfigurationTarget.Global);
        // Refresh will be called by the command handler
    }
    async loadFeeds() {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const feedUrl = config.get('feedUrl') || 'https://dev.to/feed';
        const recordCount = config.get('recordCount') || 20;
        this.posts = [];
        this.categories.clear();
        try {
            // Append record count parameter to URL
            const urlWithParams = this.appendRecordCount(feedUrl, recordCount);
            const posts = await this.fetchFeed(urlWithParams);
            const filteredPosts = this.filterPostsByDate(posts);
            this.posts.push(...filteredPosts);
        }
        catch (error) {
            console.error('Error loading feed:', error);
        }
        this.categorizePosts();
    }
    async fetchFeed(feedUrl) {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'RSS Blog Categorizer Extension/1.0'
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
                        const parser = new fast_xml_parser_1.XMLParser({
                            ignoreAttributes: false,
                            attributeNamePrefix: '@_'
                        });
                        const result = parser.parse(data);
                        const posts = this.parseRSSFeed(result, feedUrl);
                        resolve(posts);
                    }
                    catch (error) {
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
    parseRSSFeed(rssData, feedUrl) {
        const posts = [];
        try {
            const channel = rssData.rss?.channel || rssData.feed;
            const items = Array.isArray(channel.item) ? channel.item :
                channel.item ? [channel.item] :
                    Array.isArray(channel.entry) ? channel.entry :
                        channel.entry ? [channel.entry] : [];
            const feedTitle = channel.title || new URL(feedUrl).hostname;
            items.forEach((item) => {
                let link = '';
                // Handle different link formats (RSS vs Atom)
                if (typeof item.link === 'string') {
                    link = item.link;
                }
                else if (item.link?.['@_href']) {
                    link = item.link['@_href'];
                }
                else if (Array.isArray(item.link)) {
                    // Atom feeds can have multiple links - prefer alternate
                    const alternateLink = item.link.find((l) => l['@_rel'] === 'alternate');
                    link = alternateLink?.['@_href'] || item.link[0]?.['@_href'] || '';
                }
                else if (item.link?.href) {
                    link = item.link.href;
                }
                const post = {
                    title: item.title || 'Untitled',
                    link: link,
                    description: this.stripHtml(item.description || item.summary || ''),
                    pubDate: item.pubDate || item.published || item.updated || '',
                    category: this.categorizePost(item.title || '', item.description || ''),
                    source: feedTitle
                };
                if (post.title && post.link) {
                    posts.push(post);
                }
            });
        }
        catch (error) {
            console.error('Error parsing RSS data:', error);
        }
        return posts;
    }
    categorizePost(title, description) {
        const content = (title + ' ' + description).toLowerCase();
        const categories = {
            'JavaScript': ['javascript', 'js', 'node.js', 'nodejs', 'react', 'vue', 'angular', 'typescript'],
            'Python': ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
            'DevOps': ['docker', 'kubernetes', 'ci/cd', 'deployment', 'aws', 'azure', 'gcp', 'terraform'],
            'Web Development': ['html', 'css', 'frontend', 'backend', 'api', 'rest', 'graphql'],
            'Mobile': ['ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
            'Data Science': ['machine learning', 'ai', 'data science', 'analytics', 'big data'],
            'Programming': ['algorithm', 'data structure', 'coding', 'programming', 'software'],
            'Tools': ['git', 'vscode', 'ide', 'editor', 'productivity']
        };
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => content.includes(keyword))) {
                return category;
            }
        }
        return 'General';
    }
    categorizePosts() {
        this.categories.clear();
        this.posts.forEach(post => {
            const category = post.category;
            if (!this.categories.has(category)) {
                this.categories.set(category, []);
            }
            this.categories.get(category).push(post);
        });
        // Sort posts in each category by date (newest first)
        this.categories.forEach(posts => {
            posts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        });
    }
    appendRecordCount(feedUrl, recordCount) {
        const url = new URL(feedUrl);
        url.searchParams.set('n', recordCount.toString());
        return url.toString();
    }
    filterPostsByDate(posts) {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const minimumDateTimeStr = config.get('minimumDateTime') || '';
        let minimumDateTime;
        if (minimumDateTimeStr.trim() === '') {
            // Default to last 24 hours
            minimumDateTime = new Date();
            minimumDateTime.setHours(minimumDateTime.getHours() - 24);
        }
        else {
            try {
                minimumDateTime = new Date(minimumDateTimeStr);
                if (isNaN(minimumDateTime.getTime())) {
                    // Invalid date, fall back to 24 hours
                    minimumDateTime = new Date();
                    minimumDateTime.setHours(minimumDateTime.getHours() - 24);
                }
            }
            catch (error) {
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
            }
            catch (error) {
                return false; // Exclude posts with invalid dates
            }
        });
    }
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').substring(0, 200);
    }
}
exports.RSSBlogProvider = RSSBlogProvider;
//# sourceMappingURL=rssProvider.js.map