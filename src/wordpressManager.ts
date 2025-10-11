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
    constructor(private context: vscode.ExtensionContext) {}

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
     * Prompt user for WordPress credentials and store them securely
     */
    async setWordpressCredentials(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('rssBlogCategorizer');
        const currentBlogUrl = config.get<string>('wordpressBlogUrl') || '';
        const currentUsername = config.get<string>('wordpressUsername') || '';
        
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
            prompt: 'Enter WordPress username',
            placeHolder: 'username',
            value: currentUsername
        });
        
        if (!username) {
            return false; // User cancelled
        }
        
        // Get password securely
        const password = await vscode.window.showInputBox({
            prompt: `Enter WordPress password for user: ${username}`,
            password: true,
            placeHolder: 'Enter your WordPress password or application password'
        });
        
        if (!password) {
            return false; // User cancelled
        }

        try {
            // Save settings
            await config.update('wordpressBlogUrl', blogUrl, vscode.ConfigurationTarget.Global);
            await config.update('wordpressUsername', username, vscode.ConfigurationTarget.Global);
            await this.setWordpressPassword(password);
            
            vscode.window.showInformationMessage('WordPress credentials saved successfully!');
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save WordPress credentials: ${error}`);
            return false;
        }
    }

    /**
     * Create XML-RPC request body for WordPress
     */
    private createXmlRpcRequest(methodName: string, params: any[]): string {
        const paramsXml = params.map(param => this.encodeValue(param)).join('');
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
    <methodName>${methodName}</methodName>
    <params>${paramsXml}</params>
</methodCall>`;
    }

    /**
     * Encode values for XML-RPC
     */
    private encodeValue(value: any): string {
        if (typeof value === 'string') {
            return `<param><value><string>${this.escapeXml(value)}</string></value></param>`;
        } else if (typeof value === 'number') {
            return `<param><value><int>${value}</int></value></param>`;
        } else if (typeof value === 'boolean') {
            return `<param><value><boolean>${value ? '1' : '0'}</boolean></value></param>`;
        } else if (value instanceof Date) {
            return `<param><value><dateTime.iso8601>${value.toISOString()}</dateTime.iso8601></value></param>`;
        } else if (typeof value === 'object' && value !== null) {
            const members = Object.entries(value)
                .map(([key, val]) => `<member><name>${key}</name>${this.encodeValue(val).replace(/<param><value>|<\/value><\/param>/g, '')}</member>`)
                .join('');
            return `<param><value><struct>${members}</struct></value></param>`;
        }
        return '';
    }

    /**
     * Escape XML special characters
     */
    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Make XML-RPC request to WordPress
     */
    private async makeXmlRpcRequest(blogUrl: string, requestBody: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const url = new URL('/xmlrpc.php', blogUrl);
            
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml',
                    'Content-Length': Buffer.byteLength(requestBody),
                    'User-Agent': 'VS Code RSS Blog Categorizer Extension'
                }
            };

            const protocol = url.protocol === 'https:' ? https : require('http');
            const req = protocol.request(options, (res: any) => {
                let data = '';
                res.on('data', (chunk: any) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            // Parse XML-RPC response (simplified parser)
                            const result = this.parseXmlRpcResponse(data);
                            resolve(result);
                        } catch (error) {
                            reject(new Error(`Failed to parse XML-RPC response: ${error}`));
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                });
            });

            req.on('error', (error: any) => {
                reject(error);
            });

            req.write(requestBody);
            req.end();
        });
    }

    /**
     * Simple XML-RPC response parser
     */
    private parseXmlRpcResponse(xml: string): any {
        // Simple regex-based parser for XML-RPC responses
        const faultMatch = xml.match(/<fault>[\s\S]*?<\/fault>/);
        if (faultMatch) {
            const codeMatch = xml.match(/<int>(\d+)<\/int>/);
            const messageMatch = xml.match(/<string>(.*?)<\/string>/);
            const code = codeMatch ? parseInt(codeMatch[1]) : 0;
            const message = messageMatch ? messageMatch[1] : 'Unknown error';
            throw new Error(`WordPress error ${code}: ${message}`);
        }

        // Extract value from successful response
        const valueMatch = xml.match(/<value>(.*?)<\/value>/s);
        if (valueMatch) {
            const content = valueMatch[1];
            
            // Parse different types
            const stringMatch = content.match(/<string>(.*?)<\/string>/s);
            if (stringMatch) {
                return stringMatch[1];
            }

            const intMatch = content.match(/<int>(\d+)<\/int>/);
            if (intMatch) {
                return parseInt(intMatch[1]);
            }

            const booleanMatch = content.match(/<boolean>([01])<\/boolean>/);
            if (booleanMatch) {
                return booleanMatch[1] === '1';
            }
        }

        return null;
    }

    /**
     * Extract technology tags from HTML content
     */
    private extractTagsFromContent(html: string): string[] {
        const content = html.toLowerCase();
        const detectedTags = new Set<string>();

        // Technology keywords and their normalized tag names
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

        // Check for each technology keyword
        for (const [tag, keywords] of Object.entries(techKeywords)) {
            const found = keywords.some(keyword => {
                const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                return regex.test(content);
            });
            
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

        try {
            const requestBody = this.createXmlRpcRequest('wp.getProfile', [1, username, password]);
            await this.makeXmlRpcRequest(blogUrl, requestBody);
            vscode.window.showInformationMessage('WordPress connection successful!');
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`WordPress connection failed: ${error}`);
            return false;
        }
    }

    /**
     * Publish post to WordPress
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
                post_title: post.title,
                post_content: post.content,
                post_status: post.status || 'draft',
                post_type: 'post'
            };

            if (post.dateCreated) {
                postData.post_date = post.dateCreated.toISOString();
            }

            // Add categories if provided
            if (post.categories && post.categories.length > 0) {
                // WordPress XML-RPC can create categories automatically when using terms_names
                postData.terms_names = {
                    category: post.categories
                };
                console.log(`Setting categories: ${post.categories.join(', ')}`);
            }

            // Add tags if provided
            if (post.tags && post.tags.length > 0) {
                // Add tags to terms_names (WordPress will create them if they don't exist)
                if (!postData.terms_names) {
                    postData.terms_names = {};
                }
                postData.terms_names.post_tag = post.tags;
                console.log(`Setting ${post.tags.length} tags: ${post.tags.join(', ')}`);
            }

            const requestBody = this.createXmlRpcRequest('wp.newPost', [1, username, password, postData]);
            const postId = await this.makeXmlRpcRequest(blogUrl, requestBody);
            
            if (postId) {
                const status = post.status === 'publish' ? 'published' : 'saved as draft';
                let message = `Post ${status} successfully! Post ID: ${postId}`;
                
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

        // Auto-detect tags from content
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
            content: html,
            status: status.value as 'draft' | 'publish',
            dateCreated: new Date(),
            categories: categories,
            tags: finalTags
        };

        return await this.publishPost(post);
    }
}