import * as vscode from 'vscode';
import * as https from 'https';
import { WORDPRESS_PASSWORD_KEY } from './constants';

export interface WordPressPost {
    title: string;
    content: string;
    status?: 'draft' | 'publish';
    dateCreated?: Date;
    categories?: string[];
    tags?: string[];
}

export class WordPressManager {
    private readonly compiledTechKeywords: Map<string, RegExp[]>;

    constructor(private context: vscode.ExtensionContext) {
        this.compiledTechKeywords = this.initializeTechKeywords();
    }

    /**
     * Initialize and pre-compile regex patterns for technology keywords
     */
    private initializeTechKeywords(): Map<string, RegExp[]> {
        const techKeywords = {
            // .NET & Microsoft Technologies
            '.net': ['.net', 'dotnet', 'dot net', '.net framework', '.net core', 'asp.net', 'asp.net core'],
            '.net 9': ['.net 9', 'dotnet 9'],
            '.net 10': ['.net 10', 'dotnet 10'],
            '.net maui': ['.net maui', 'dotnet maui', 'maui'],
            'asp.net core': ['asp.net core', 'aspnet core', 'aspnetcore'],
            'blazor': ['blazor'],
            'c#': ['c#', 'csharp', 'c sharp'],
            'ef core': ['ef core', 'entity framework', 'entity framework core'],
            'visual studio': ['visual studio', 'vs 2022', 'vs 2025', 'vs 2026', 'vs2022', 'vs2025', 'vs2026'],
            'vs code': ['vs code', 'visual studio code', 'vscode'],
            'winrt': ['winrt', 'windows runtime'],
            'windows 11': ['windows 11'],
            'windows ml': ['windows ml', 'windowsml'],
            'uno platform': ['uno platform'],

            // Web Technologies
            'javascript': ['javascript', 'js'],
            'typescript': ['typescript', 'ts'],
            'node.js': ['node.js', 'nodejs', 'node js'],
            'react': ['react', 'reactjs'],
            'css': ['css', 'css3'],
            'html': ['html', 'html5'],
            'vite': ['vite'],

            // Cloud & DevOps
            'azure': ['azure', 'microsoft azure'],
            'azure ai foundry': ['azure ai foundry', 'ai foundry'],
            'aws': ['aws', 'amazon web services'],
            'docker': ['docker', 'containerization'],
            'kubernetes': ['kubernetes', 'k8s'],
            'teamcity': ['teamcity'],

            // Databases
            'sql server': ['sql server', 'mssql'],
            'mysql': ['mysql'],
            'postgresql': ['postgresql', 'postgres'],

            // AI & ML
            'ai': ['artificial intelligence', 'machine learning', 'ai agent', 'ai agents'],
            'chatgpt': ['chatgpt', 'chat gpt'],
            'copilot': ['github copilot', 'copilot'],
            'copilot chat': ['copilot chat'],
            'claude code': ['claude code'],
            'google gemini': ['google gemini', 'gemini'],
            'perplexity': ['perplexity'],

            // Mobile & IoT
            'android': ['android'],
            'android studio': ['android studio'],
            'kotlin': ['kotlin'],
            'swift': ['swift'],
            'raspberry pi': ['raspberry pi', 'raspi'],

            // Programming Languages
            'python': ['python'],
            'golang': ['golang', 'go lang', 'go programming'],
            'c++': ['c++', 'cpp'],

            // Other Technologies
            'playwright': ['playwright'],
            'auth0': ['auth0'],
            'github universe': ['github universe'],
            'ms ignite': ['ms ignite', 'microsoft ignite'],
            'm365': ['m365', 'microsoft 365', 'office 365'],
            'onedrive': ['onedrive'],
            'mcp': ['mcp', 'model context protocol'],
            'agile': ['agile', 'scrum', 'kanban'],
            'vibe coding': ['vibe coding']
        };

        const compiledMap = new Map<string, RegExp[]>();
        
        // Pre-compile all regex patterns for better performance
        for (const [tag, keywords] of Object.entries(techKeywords)) {
            const compiledPatterns = keywords.map(keyword => 
                new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
            );
            compiledMap.set(tag, compiledPatterns);
        }
        
        return compiledMap;
    }

    /**
     * Get WordPress password from secure storage
     */
    private async getWordpressPassword(): Promise<string | undefined> {
        return await this.context.secrets.get(WORDPRESS_PASSWORD_KEY);
    }

    /**
     * Store WordPress password in secure storage
     */
    private async setWordpressPassword(password: string): Promise<void> {
        await this.context.secrets.store(WORDPRESS_PASSWORD_KEY, password);
    }

    /**
     * Show Application Password creation instructions
     */
    async showApplicationPasswordInstructions(): Promise<void> {
        const instructions = `
# WordPress Application Password Setup

For secure authentication with the WordPress REST API, you should create an Application Password:

## Steps:
1. **Log into your WordPress admin panel**
2. **Go to Users → Profile** (or Users → All Users → [Your User])
3. **Scroll down to "Application Passwords" section**
4. **Enter application name**: "VS Code RSS Extension" (or any name)
5. **Click "Add New Application Password"**
6. **Copy the generated password** (it will look like: xxxx xxxx xxxx xxxx xxxx xxxx)
7. **Use this Application Password** when setting up credentials in VS Code

## Important Notes:
- Application Passwords are more secure than regular passwords
- They can be revoked individually without changing your main password
- Your username remains the same, only the password is different
- The Application Password will have spaces - this is normal

## Alternative:
If Application Passwords are not available on your WordPress site, you may need to:
- Update WordPress to version 5.6 or higher
- Enable Application Passwords via a plugin
- Or use your regular WordPress password (less secure)

Would you like to open your WordPress admin panel now?
        `;

        const choice = await vscode.window.showInformationMessage(
            'Application Password setup instructions are ready.',
            'View Instructions',
            'Open WordPress Admin',
            'Continue with Setup'
        );

        if (choice === 'View Instructions') {
            // Create a new untitled document with the instructions
            const doc = await vscode.workspace.openTextDocument({
                content: instructions,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        } else if (choice === 'Open WordPress Admin') {
            const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
            const blogUrl = config.get<string>('wordpressBlogUrl');
            if (blogUrl) {
                const adminUrl = `${blogUrl.replace(/\/$/, '')}/wp-admin/profile.php`;
                vscode.env.openExternal(vscode.Uri.parse(adminUrl));
            } else {
                vscode.window.showErrorMessage('Please set your blog URL first');
            }
        }
    }

    /**
     * Prompt user for WordPress credentials and store them securely
     */
    async setWordpressCredentials(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const currentBlogUrl = config.get<string>('wordpressBlogUrl') || '';
        const currentUsername = config.get<string>('wordpressUsername') || '';
        
        // Show instructions first
        const showInstructions = await vscode.window.showInformationMessage(
            'WordPress REST API requires an Application Password for secure authentication. Would you like to see setup instructions first?',
            'Show Instructions',
            'I have my credentials ready',
            'Cancel'
        );

        if (showInstructions === 'Show Instructions') {
            await this.showApplicationPasswordInstructions();
            
            const continueSetup = await vscode.window.showInformationMessage(
                'Ready to enter your credentials?',
                'Yes, continue',
                'Cancel'
            );
            
            if (continueSetup !== 'Yes, continue') {
                return false;
            }
        } else if (showInstructions === 'Cancel') {
            return false;
        }
        
        // Get blog URL
        const blogUrl = await vscode.window.showInputBox({
            prompt: 'Enter WordPress blog URL (e.g., https://yourblog.com)',
            placeHolder: 'https://yourblog.com',
            value: currentBlogUrl
        });
        
        if (!blogUrl) {
            return false; // User cancelled
        }

        // Validate URL format
        try {
            new URL(blogUrl);
        } catch {
            vscode.window.showErrorMessage('Invalid blog URL format. Please enter a valid URL (e.g., https://yourblog.com)');
            return false;
        }
        
        // Get username
        const username = await vscode.window.showInputBox({
            prompt: 'Enter WordPress username (same as your login username)',
            placeHolder: 'username',
            value: currentUsername
        });
        
        if (!username) {
            return false; // User cancelled
        }
        
        // Get application password
        const appPassword = await vscode.window.showInputBox({
            prompt: `Enter WordPress Application Password for user: ${username}`,
            password: true,
            placeHolder: 'xxxx xxxx xxxx xxxx xxxx xxxx (Application Password with spaces)'
        });
        
        if (!appPassword) {
            return false; // User cancelled
        }

        try {
            // Save settings
            await config.update('wordpressBlogUrl', blogUrl, vscode.ConfigurationTarget.Global);
            await config.update('wordpressUsername', username, vscode.ConfigurationTarget.Global);
            await this.setWordpressPassword(appPassword);
            
            vscode.window.showInformationMessage('WordPress credentials saved successfully! Use "Test WordPress Connection" to verify.');
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save WordPress credentials: ${error}`);
            return false;
        }
    }

    /**
     * Create Basic Auth header for WordPress REST API
     */
    private createAuthHeader(username: string, password: string): string {
        const credentials = Buffer.from(`${username}:${password}`).toString('base64');
        console.log(`Creating auth header for user: ${username}`);
        return `Basic ${credentials}`;
    }

    /**
     * Make REST API request to WordPress
     */
    private async makeRestApiRequest(blogUrl: string, endpoint: string, method: string = 'GET', data?: any, username?: string, password?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const url = new URL(`/wp-json/wp/v2/${endpoint}`, blogUrl);
            
            console.log(`Making REST API request to: ${url.toString()}`);
            console.log(`Method: ${method}, Host: ${url.hostname}, Port: ${url.port || (url.protocol === 'https:' ? 443 : 80)}, Path: ${url.pathname}`);
            
            const requestBody = data ? JSON.stringify(data) : '';
            
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'VS Code RSS Blog Categorizer Extension',
                    'Accept': 'application/json'
                } as any
            };

            // Add authentication header if credentials provided
            if (username && password) {
                options.headers['Authorization'] = this.createAuthHeader(username, password);
            }

            // Set content length for POST/PUT requests
            if (requestBody) {
                options.headers['Content-Length'] = Buffer.byteLength(requestBody);
            }

            const protocol = url.protocol === 'https:' ? https : require('http');
            const req = protocol.request(options, (res: any) => {
                let responseData = '';
                res.on('data', (chunk: any) => { responseData += chunk; });
                res.on('end', () => {
                    console.log(`REST API response: HTTP ${res.statusCode}`);
                    
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const result = responseData ? JSON.parse(responseData) : {};
                            resolve(result);
                        } catch (error) {
                            reject(new Error(`Failed to parse JSON response: ${error}`));
                        }
                    } else {
                        // Try to parse error response
                        let errorMessage = `HTTP ${res.statusCode}: ${res.statusMessage}`;
                        try {
                            const errorData = JSON.parse(responseData);
                            if (errorData.message) {
                                errorMessage = `${errorMessage} - ${errorData.message}`;
                            }
                        } catch {
                            // Use raw response if JSON parsing fails
                            if (responseData) {
                                errorMessage = `${errorMessage} - ${responseData}`;
                            }
                        }
                        reject(new Error(errorMessage));
                    }
                });
            });

            req.on('error', (error: any) => {
                reject(error);
            });

            if (requestBody) {
                req.write(requestBody);
            }
            req.end();
        });
    }



    /**
     * Extract technology tags from HTML content using pre-compiled regex patterns
     */
    private extractTagsFromContent(html: string): string[] {
        const content = html.toLowerCase();
        const detectedTags = new Set<string>();

        // Check for each technology keyword using pre-compiled regex patterns
        for (const [tag, patterns] of this.compiledTechKeywords) {
            const found = patterns.some(regex => regex.test(content));
            
            if (found) {
                detectedTags.add(tag);
            }
        }

        // Additional pattern-based detection
        // Version numbers (e.g., .NET 8, Python 3.12, etc.)
        const versionPatterns = [
            /\.net\s*(\d+(?:\.\d+)?)/gi,
            /python\s*(\d+(?:\.\d+)?)/gi,
            /node\.?js\s*(\d+(?:\.\d+)?)/gi,
            /react\s*(\d+(?:\.\d+)?)/gi
        ];

        versionPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const normalized = match.toLowerCase().replace(/\s+/g, ' ').trim();
                    detectedTags.add(normalized);
                });
            }
        });

        // Convert to array and sort
        const tagsArray = Array.from(detectedTags).sort();
        
        console.log(`Detected ${tagsArray.length} tags from content:`, tagsArray);
        return tagsArray;
    }

    /**
     * Test WordPress REST API endpoint accessibility
     */
    async testRestApiEndpoint(blogUrl: string): Promise<boolean> {
        try {
            // Test the basic REST API endpoint without authentication first
            console.log('Testing REST API endpoint accessibility...');
            await this.makeRestApiRequest(blogUrl, 'posts?per_page=1', 'GET');
            console.log('REST API endpoint is accessible');
            return true;
        } catch (error) {
            console.error(`REST API endpoint test failed: ${error}`);
            return false;
        }
    }

    /**
     * Test different authentication methods
     */
    async testAuthenticationMethods(blogUrl: string, username: string, password: string): Promise<string[]> {
        const workingMethods: string[] = [];
        
        // Test 1: Basic authentication with application password
        try {
            console.log('Testing basic authentication...');
            await this.makeRestApiRequest(blogUrl, 'users/me', 'GET', undefined, username, password);
            workingMethods.push('Basic Auth');
            console.log('Basic authentication works');
        } catch (error) {
            console.log(`Basic authentication failed: ${error}`);
        }
        
        // Test 2: Try accessing a public endpoint that requires auth (like creating a post in draft)
        try {
            console.log('Testing post creation capabilities...');
            const testPost = {
                title: 'Test Connection Post - DELETE ME',
                content: 'This is a test post created by VS Code extension to verify connection. Please delete.',
                status: 'draft'
            };
            const result = await this.makeRestApiRequest(blogUrl, 'posts', 'POST', testPost, username, password);
            if (result && result.id) {
                // Try to delete the test post immediately
                try {
                    await this.makeRestApiRequest(blogUrl, `posts/${result.id}`, 'DELETE', undefined, username, password);
                    console.log('Test post created and deleted successfully');
                } catch (deleteError) {
                    console.log(`Test post created (ID: ${result.id}) but could not delete: ${deleteError}`);
                }
                workingMethods.push('Post Creation');
            }
        } catch (error) {
            console.log(`Post creation test failed: ${error}`);
        }
        
        return workingMethods;
    }

    /**
     * Test WordPress connection
     */
    async testConnection(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const blogUrl = config.get<string>('wordpressBlogUrl');
        const username = config.get<string>('wordpressUsername');
        const password = await this.getWordpressPassword();

        if (!blogUrl || !username || !password) {
            vscode.window.showErrorMessage('WordPress credentials not configured. Please set them first.');
            return false;
        }

        console.log(`Testing connection to: ${blogUrl}`);
        console.log(`Username: ${username}`);

        // First test if REST API endpoint is accessible
        const endpointAccessible = await this.testRestApiEndpoint(blogUrl);
        if (!endpointAccessible) {
            vscode.window.showErrorMessage(
                `WordPress REST API endpoint not accessible at ${blogUrl}/wp-json/wp/v2/. ` +
                'Please check:\n' +
                '1. WordPress REST API is enabled\n' +
                '2. Your blog URL is correct\n' +
                '3. No security plugins are blocking REST API'
            );
            return false;
        }

        // Test different authentication methods
        const workingMethods = await this.testAuthenticationMethods(blogUrl, username, password);
        
        if (workingMethods.length > 0) {
            vscode.window.showInformationMessage(
                `WordPress REST API connection successful!\nWorking authentication methods: ${workingMethods.join(', ')}`
            );
            return true;
        } else {
            // Provide detailed troubleshooting information
            const troubleshootingInfo = await this.gatherTroubleshootingInfo(blogUrl);
            
            vscode.window.showErrorMessage(
                `WordPress connection failed. All authentication methods failed.\n\n` +
                `Troubleshooting info:\n${troubleshootingInfo}\n\n` +
                `Common solutions:\n` +
                `1. Create an Application Password in WordPress Admin → Users → Profile\n` +
                `2. Check if security plugins are blocking REST API\n` +
                `3. Verify username is correct and user has 'publish_posts' capability\n` +
                `4. Try temporarily disabling security plugins`
            );
            return false;
        }
    }

    /**
     * Gather troubleshooting information
     */
    private async gatherTroubleshootingInfo(blogUrl: string): Promise<string> {
        const info: string[] = [];
        
        try {
            // Test if we can get basic site info
            const siteInfo = await this.makeRestApiRequest(blogUrl, '', 'GET');
            if (siteInfo && siteInfo.name) {
                info.push(`✓ Site accessible: ${siteInfo.name}`);
            }
            
            // Test authentication requirements
            if (siteInfo && siteInfo.authentication) {
                info.push(`Authentication info: ${JSON.stringify(siteInfo.authentication)}`);
            }
        } catch (error) {
            info.push(`✗ Site info request failed: ${error}`);
        }
        
        // Test specific endpoints
        try {
            await this.makeRestApiRequest(blogUrl, 'posts?per_page=1', 'GET');
            info.push('✓ Posts endpoint accessible (no auth)');
        } catch (error) {
            info.push(`✗ Posts endpoint failed: ${error}`);
        }
        
        return info.join('\n');
    }

    /**
     * Generate URL-friendly slug from name
     */
    private generateSlug(name: string): string {
        return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }

    /**
     * Get or create category by name
     */
    private async getOrCreateCategory(blogUrl: string, categoryName: string, username: string, password: string): Promise<number> {
        try {
            // First, try to find existing category
            const categories = await this.makeRestApiRequest(blogUrl, `categories?search=${encodeURIComponent(categoryName)}`, 'GET', undefined, username, password);
            
            const existingCategory = categories.find((cat: any) => cat.name.toLowerCase() === categoryName.toLowerCase());
            if (existingCategory) {
                console.log(`Found existing category: ${categoryName} (ID: ${existingCategory.id})`);
                return existingCategory.id;
            }

            // Create new category if not found
            const newCategory = await this.makeRestApiRequest(blogUrl, 'categories', 'POST', {
                name: categoryName,
                slug: this.generateSlug(categoryName)
            }, username, password);
            
            console.log(`Created new category: ${categoryName} (ID: ${newCategory.id})`);
            return newCategory.id;
        } catch (error) {
            console.error(`Failed to get/create category ${categoryName}: ${error}`);
            return 0; // Return 0 if category creation fails
        }
    }

    /**
     * Get or create tag by name
     */
    private async getOrCreateTag(blogUrl: string, tagName: string, username: string, password: string): Promise<number> {
        try {
            // First, try to find existing tag
            const tags = await this.makeRestApiRequest(blogUrl, `tags?search=${encodeURIComponent(tagName)}`, 'GET', undefined, username, password);
            
            const existingTag = tags.find((tag: any) => tag.name.toLowerCase() === tagName.toLowerCase());
            if (existingTag) {
                console.log(`Found existing tag: ${tagName} (ID: ${existingTag.id})`);
                return existingTag.id;
            }

            // Create new tag if not found
            const newTag = await this.makeRestApiRequest(blogUrl, 'tags', 'POST', {
                name: tagName,
                slug: this.generateSlug(tagName)
            }, username, password);
            
            console.log(`Created new tag: ${tagName} (ID: ${newTag.id})`);
            return newTag.id;
        } catch (error) {
            console.error(`Failed to get/create tag ${tagName}: ${error}`);
            return 0; // Return 0 if tag creation fails
        }
    }

    /**
     * Publish post to WordPress using REST API
     */
    async publishPost(post: WordPressPost): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const blogUrl = config.get<string>('wordpressBlogUrl');
        const username = config.get<string>('wordpressUsername');
        const password = await this.getWordpressPassword();

        if (!blogUrl || !username || !password) {
            vscode.window.showErrorMessage('WordPress credentials not configured. Please set them first.');
            return false;
        }

        try {
            const postData: any = {
                title: post.title,
                content: post.content,
                status: post.status || 'draft'
            };

            if (post.dateCreated) {
                postData.date = post.dateCreated.toISOString();
            }

            // Handle categories
            if (post.categories && post.categories.length > 0) {
                console.log(`Processing ${post.categories.length} categories: ${post.categories.join(', ')}`);
                const categoryIds: number[] = [];
                
                for (const categoryName of post.categories) {
                    const categoryId = await this.getOrCreateCategory(blogUrl, categoryName, username, password);
                    if (categoryId > 0) {
                        categoryIds.push(categoryId);
                    }
                }
                
                if (categoryIds.length > 0) {
                    postData.categories = categoryIds;
                    console.log(`Set categories with IDs: ${categoryIds.join(', ')}`);
                }
            }

            // Handle tags
            if (post.tags && post.tags.length > 0) {
                console.log(`Processing ${post.tags.length} tags: ${post.tags.join(', ')}`);
                const tagIds: number[] = [];
                
                for (const tagName of post.tags) {
                    const tagId = await this.getOrCreateTag(blogUrl, tagName, username, password);
                    if (tagId > 0) {
                        tagIds.push(tagId);
                    }
                }
                
                if (tagIds.length > 0) {
                    postData.tags = tagIds;
                    console.log(`Set tags with IDs: ${tagIds.join(', ')}`);
                }
            }

            const result = await this.makeRestApiRequest(blogUrl, 'posts', 'POST', postData, username, password);
            
            if (result && result.id) {
                const status = post.status === 'publish' ? 'published' : 'saved as draft';
                let message = `Post ${status} successfully! Post ID: ${result.id}`;
                
                if (post.categories && post.categories.length > 0) {
                    message += ` Categories: ${post.categories.join(', ')}`;
                }
                
                if (post.tags && post.tags.length > 0) {
                    message += ` Tags: ${post.tags.length} detected`;
                }
                
                vscode.window.showInformationMessage(message);
                return true;
            } else {
                vscode.window.showErrorMessage('Failed to create post: No post ID returned');
                return false;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to publish post: ${error}`);
            return false;
        }
    }

    /**
     * Extract body content from HTML (content between <body> and </body> tags)
     * Also removes H1 tags since WordPress renders the post title as H1
     */
    private extractBodyContent(html: string): string {
        let content: string;
        
        // Try to extract content from <body> tags
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch && bodyMatch[1]) {
            content = bodyMatch[1].trim();
        } else {
            // Fallback: if no body tags found, return the full HTML
            // This handles cases where the exported HTML might not have proper body tags
            console.warn('No <body> tags found in HTML, using full content');
            content = html;
        }

        // Remove H1 tags since WordPress automatically renders the post title as H1
        // This prevents duplicate H1 headings and improves HTML structure
        content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
        
        // Clean up any extra whitespace left after removing H1
        content = content.replace(/^\s+|\s+$/g, '').replace(/\n\s*\n\s*\n/g, '\n\n');
        
        console.log('Removed H1 tags from content to avoid duplicate headings with WordPress post title');
        
        return content;
    }

    /**
     * Extract title from HTML content
     */
    private extractTitleFromHtml(html: string): string {
        // Try to get title from <title> tag first
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch) {
            return titleMatch[1].trim();
        }

        // Fallback to first <h1> tag
        const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (h1Match) {
            return h1Match[1].replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
        }

        // Default title
        return `Blog Post - ${new Date().toLocaleDateString()}`;
    }

    /**
     * Publish HTML file content to WordPress
     */
    async publishHtmlFile(document: vscode.TextDocument): Promise<boolean> {
        const html = document.getText();
        const title = this.extractTitleFromHtml(html);
        const bodyContent = this.extractBodyContent(html);

        // Get default categories from configuration
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const defaultCategories = config.get<string[]>('wordpressCategories') || ['Daily Links', 'Development'];

        // Ask user about categories
        const categoryChoice = await vscode.window.showQuickPick(
            [
                { 
                    label: `Use default categories: ${defaultCategories.join(', ')}`, 
                    value: 'default',
                    description: 'Use the categories configured in settings'
                },
                { 
                    label: 'Customize categories for this post', 
                    value: 'custom',
                    description: 'Enter custom categories for this specific post'
                },
                { 
                    label: 'No categories', 
                    value: 'none',
                    description: 'Publish without assigning any categories'
                }
            ],
            {
                placeHolder: 'Which categories would you like to assign to this post?'
            }
        );

        if (!categoryChoice) {
            return false; // User cancelled
        }

        let categories: string[] = [];
        if (categoryChoice.value === 'default') {
            categories = defaultCategories;
        } else if (categoryChoice.value === 'custom') {
            const customCategoriesInput = await vscode.window.showInputBox({
                prompt: 'Enter categories separated by commas',
                placeHolder: 'e.g., Daily Links, Development, Tech News',
                value: defaultCategories.join(', ')
            });

            if (!customCategoriesInput) {
                return false; // User cancelled
            }

            categories = customCategoriesInput
                .split(',')
                .map(cat => cat.trim())
                .filter(cat => cat.length > 0);
        }
        // If 'none', categories remains empty array

        // Ask user for post status
        const status = await vscode.window.showQuickPick(
            [
                { label: 'Publish immediately', value: 'publish' },
                { label: 'Save as draft', value: 'draft' }
            ],
            {
                placeHolder: 'How would you like to publish this post?'
            }
        );

        if (!status) {
            return false; // User cancelled
        }

        // Auto-detect tags from full HTML content (including title, etc.)
        const detectedTags = this.extractTagsFromContent(html);

        // Show detected tags to user for confirmation
        let finalTags = detectedTags;
        if (detectedTags.length > 0) {
            const tagChoice = await vscode.window.showQuickPick(
                [
                    { 
                        label: `Use ${detectedTags.length} auto-detected tags`, 
                        value: 'auto',
                        description: detectedTags.slice(0, 5).join(', ') + (detectedTags.length > 5 ? '...' : '')
                    },
                    { 
                        label: 'Customize tags', 
                        value: 'custom',
                        description: 'Edit the detected tags'
                    },
                    { 
                        label: 'No tags', 
                        value: 'none',
                        description: 'Publish without tags'
                    }
                ],
                {
                    placeHolder: 'Tags detected automatically from content. How would you like to proceed?'
                }
            );

            if (!tagChoice) {
                return false; // User cancelled
            }

            if (tagChoice.value === 'custom') {
                const customTagsInput = await vscode.window.showInputBox({
                    prompt: 'Enter tags separated by commas',
                    placeHolder: 'e.g., .net, c#, azure, javascript',
                    value: detectedTags.join(', ')
                });

                if (customTagsInput === undefined) {
                    return false; // User cancelled
                }

                finalTags = customTagsInput
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0);
            } else if (tagChoice.value === 'none') {
                finalTags = [];
            }
        }

        const post: WordPressPost = {
            title: title,
            content: bodyContent,
            status: status.value as 'draft' | 'publish',
            dateCreated: new Date(),
            categories: categories,
            tags: finalTags
        };

        const publishSuccess = await this.publishPost(post);
        
        // If publish was successful, update the Dometrain course ID to rotate to next course
        if (publishSuccess) {
            await this.updateDometrainCourseAfterPublish(html);
        }
        
        return publishSuccess;
    }

    /**
     * Extract and update the Dometrain course ID after successful WordPress publish
     * This ensures the course only rotates when posts are actually published
     */
    private async updateDometrainCourseAfterPublish(html: string): Promise<void> {
        try {
            // Look for the Dometrain course ID comment in the HTML
            const match = html.match(/<!-- dometrain-course-id: ([^\s]+) -->/);
            if (match && match[1]) {
                const courseId = match[1];
                const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
                await config.update('dometrainLastCourseId', courseId, vscode.ConfigurationTarget.Global);
                console.log(`Updated Dometrain last course ID to: ${courseId} after successful publish`);
            }
        } catch (error) {
            console.error('Failed to update Dometrain course ID:', error);
            // Don't throw - this is not critical enough to fail the publish
        }
    }
}