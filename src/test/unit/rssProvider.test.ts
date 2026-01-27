import { expect, use } from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

use(sinonChai);
use(chaiAsPromised);
import * as vscode from 'vscode';
import { RSSBlogProvider, BlogPost } from '../../rssProvider';
import { MockExtensionContext, MockConfiguration } from '../mocks/mockVscode';
import { mockRssXml, mockAtomXml, mockDewDropRss, mockCategoriesConfig, mockBlogPosts } from '../mocks/testData';
import * as fs from 'fs';
import * as https from 'https';

describe('RSSBlogProvider', () => {
  let provider: RSSBlogProvider;
  let mockContext: MockExtensionContext;
  let httpsGetStub: sinon.SinonStub;
  let fsReadFileStub: sinon.SinonStub;
  let workspaceGetConfigStub: sinon.SinonStub;

  beforeEach(() => {
    mockContext = new MockExtensionContext();
    provider = new RSSBlogProvider(mockContext);
    
    // Stub external dependencies
    httpsGetStub = sinon.stub(https, 'get');
    fsReadFileStub = sinon.stub(fs.promises, 'readFile');
    workspaceGetConfigStub = sinon.stub(vscode.workspace, 'getConfiguration');
    
    // Mock configuration
    const mockConfig = new MockConfiguration({
      feedUrl: 'https://example.com/feed.xml',
      recordCount: 100,
      minimumDateTime: '',
      refreshInterval: 30,
      useNewsblurApi: false,
      newsblurUsername: ''
    });
    workspaceGetConfigStub.returns(mockConfig);
    
    // Mock categories.json loading
    fsReadFileStub.resolves(JSON.stringify(mockCategoriesConfig));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Feed Parsing', () => {
    it('should parse RSS feed correctly', async () => {
      // Mock HTTPS response for RSS feed
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockRssXml);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
      const posts = await provider.getAllPosts();

      expect(posts).to.have.length.greaterThan(0);
      expect(posts[0]).to.have.property('title');
      expect(posts[0]).to.have.property('link');
      expect(posts[0]).to.have.property('description');
      expect(posts[0]).to.have.property('pubDate');
      expect(posts[0]).to.have.property('category');
      expect(posts[0]).to.have.property('source');
      expect(posts[0]).to.have.property('author');
    });

    it('should parse Atom feed correctly', async () => {
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockAtomXml);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
      const posts = await provider.getAllPosts();

      expect(posts).to.have.length.greaterThan(0);
      const aiPost = posts.find(p => p.title.includes('Machine Learning'));
      expect(aiPost).to.exist;
      expect(aiPost?.category).to.equal('AI');
    });

    it('should handle HTTP errors gracefully', async () => {
      const mockResponse = {
        statusCode: 404,
        statusMessage: 'Not Found'
      };
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
      const posts = await provider.getAllPosts();

      expect(posts).to.have.length(0);
    });

    it('should handle network errors gracefully', async () => {
      httpsGetStub.callsFake(() => {
        const request = { on: sinon.stub() };
        setTimeout(() => {
          const errorCallback = request.on.args.find(call => call[0] === 'error')?.[1];
          if (errorCallback) errorCallback(new Error('Network error'));
        }, 0);
        return request;
      });

      await provider.refresh();
      const posts = await provider.getAllPosts();

      expect(posts).to.have.length(0);
    });
  });

  describe('Categorization', () => {
    beforeEach(async () => {
      // Setup provider with mock data
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockRssXml);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
    });

    it('should categorize posts based on title keywords', async () => {
      const posts = await provider.getAllPosts();
      
      const reactPost = posts.find(p => p.title.includes('React'));
      expect(reactPost?.category).to.equal('Web Development');
      
      const pythonPost = posts.find(p => p.title.includes('Python'));
      expect(pythonPost?.category).to.equal('Data Science');
      
      const dockerPost = posts.find(p => p.title.includes('Docker'));
      expect(dockerPost?.category).to.equal('DevOps');
    });

    it('should use default category when no keywords match', async () => {
      // Mock RSS with uncategorizable content
      const uncategorizableRss = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Random Blog Post About Nothing</title>
              <link>https://example.com/random</link>
              <description>This post has no matching keywords</description>
              <pubDate>Mon, 30 Sep 2025 10:00:00 GMT</pubDate>
              <author>Unknown Author</author>
            </item>
          </channel>
        </rss>`;

      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(uncategorizableRss);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
      const posts = await provider.getAllPosts();
      
      expect(posts[0]?.category).to.equal('General');
    });

    it('should handle whole word matching for keywords', async () => {
      // Test that "ai" matches as whole word but not as part of "main"
      const testRss = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>AI Revolution in Technology</title>
              <link>https://example.com/ai-tech</link>
              <description>About AI</description>
              <pubDate>Mon, 30 Sep 2025 10:00:00 GMT</pubDate>
              <author>Tech Writer</author>
            </item>
            <item>
              <title>Maintaining Your Application</title>
              <link>https://example.com/app-support</link>
              <description>About maintenance</description>
              <pubDate>Mon, 30 Sep 2025 10:00:00 GMT</pubDate>
              <author>Developer</author>
            </item>
          </channel>
        </rss>`;

      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(testRss);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
      const posts = await provider.getAllPosts();
      
      const aiPost = posts.find(p => p.title.includes('AI Revolution'));
      const maintainPost = posts.find(p => p.title.includes('Maintaining'));
      
      expect(aiPost?.category).to.equal('AI'); // "ai" as whole word should match
      expect(maintainPost?.category).to.equal('General'); // "ai" in "maintaining" should not match
    });
  });

  describe('Date Filtering', () => {
    it('should filter posts by minimum date when configured', async () => {
      // Set a specific minimum date that excludes old posts
      const configWithDate = new MockConfiguration({
        feedUrl: 'https://example.com/feed.xml',
        recordCount: 100,
        minimumDateTime: '2025-09-24T00:00:00Z', // Only posts from Sep 24, 2025 onwards
        refreshInterval: 30
      });
      workspaceGetConfigStub.returns(configWithDate);

      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockRssXml);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
      const posts = await provider.getAllPosts();
      
      // Should exclude the old article from 2024
      expect(posts.every(p => new Date(p.pubDate) >= new Date('2025-09-24T00:00:00Z'))).to.be.true;
      expect(posts.find(p => p.title.includes('Old Article'))).to.be.undefined;
    });

    it('should use Dew Drop date when minimum date is empty', async () => {
      // Mock the Dew Drop RSS response
      const dewDropResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockDewDropRss);
          if (event === 'end') callback();
        })
      };

      // Mock main RSS response
      const mainResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockRssXml);
          if (event === 'end') callback();
        })
      };

      httpsGetStub.callsFake((url, options, callback) => {
        if (url.includes('alvinashcraft.com')) {
          callback(dewDropResponse);
        } else {
          callback(mainResponse);
        }
        return { on: sinon.stub() };
      });

      await provider.refresh();
      const posts = await provider.getAllPosts();
      
      // Should have filtered posts based on Dew Drop date (Sep 26, 2025)
      expect(posts.length).to.be.greaterThan(0);
    });

    it('should handle invalid date formats gracefully', async () => {
      const configWithInvalidDate = new MockConfiguration({
        feedUrl: 'https://example.com/feed.xml',
        recordCount: 100,
        minimumDateTime: 'invalid-date-format',
        refreshInterval: 30
      });
      workspaceGetConfigStub.returns(configWithInvalidDate);

      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockRssXml);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      // Should not throw an error despite invalid date
      return expect(provider.refresh()).to.be.fulfilled.then(async () => {
        const posts = await provider.getAllPosts();
        expect(posts).to.be.an('array');
      });
    });

    it('should include posts with future dates (no future date filtering)', async () => {
      // Test that posts with future dates are now included since we removed future date filtering
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2); // 2 hours in the future
      
      const testRss = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Future Post Should Be Included</title>
              <link>https://example.com/future-post</link>
              <description>Future posts are now allowed</description>
              <pubDate>${futureDate.toUTCString()}</pubDate>
              <author>Future Author</author>
            </item>
          </channel>
        </rss>`;

      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(testRss);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
      const posts = await provider.getAllPosts();
      
      // Should include future posts since we removed future date filtering
      expect(posts.find(p => p.title.includes('Future Post Should Be Included'))).to.exist;
    });
  });

  describe('Buffer Configuration', () => {
    it('should apply buffer when enabled', async () => {
      const configWithBuffer = new MockConfiguration({
        feedUrl: 'https://example.com/feed.xml',
        recordCount: 100,
        minimumDateTime: '',
        refreshInterval: 30,
        enablePostFilteringBuffer: true,
        postFilteringBufferMinutes: 10
      });
      workspaceGetConfigStub.returns(configWithBuffer);

      // Mock the Dew Drop RSS response
      const dewDropResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockDewDropRss);
          if (event === 'end') callback();
        })
      };

      httpsGetStub.callsFake((url, options, callback) => {
        if (url.includes('alvinashcraft.com')) {
          callback(dewDropResponse);
        }
        return { on: sinon.stub() };
      });

      await provider.refresh();
      
      // Verify that buffer configuration is being read (test would need internal access to verify exact behavior)
      expect(workspaceGetConfigStub).to.have.been.called;
    });

    it('should work without buffer when disabled', async () => {
      const configWithoutBuffer = new MockConfiguration({
        feedUrl: 'https://example.com/feed.xml',
        recordCount: 100,
        minimumDateTime: '',
        refreshInterval: 30,
        enablePostFilteringBuffer: false,
        postFilteringBufferMinutes: 5
      });
      workspaceGetConfigStub.returns(configWithoutBuffer);

      // Mock the Dew Drop RSS response
      const dewDropResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockDewDropRss);
          if (event === 'end') callback();
        })
      };

      httpsGetStub.callsFake((url, options, callback) => {
        if (url.includes('alvinashcraft.com')) {
          callback(dewDropResponse);
        }
        return { on: sinon.stub() };
      });

      await provider.refresh();
      
      // Should work without buffer when disabled
      expect(workspaceGetConfigStub).to.have.been.called;
    });
  });

  describe('Configuration Management', () => {
    it('should set feed URL correctly', async () => {
      const testUrl = 'https://newsite.com/feed.xml';
      
      // Mock the configuration update
      const updateStub = sinon.stub();
      const mockConfig = {
        get: sinon.stub().returns('old-url'),
        update: updateStub
      };
      workspaceGetConfigStub.returns(mockConfig);

      await provider.setFeedUrl(testUrl);
      
      expect(updateStub).to.have.been.calledWith('feedUrl', testUrl, vscode.ConfigurationTarget.Global);
    });

    it('should validate URL format', async () => {
      const invalidUrl = 'not-a-valid-url';
      
      return expect(provider.setFeedUrl(invalidUrl)).to.be.rejectedWith('Invalid URL format');
    });

    it('should append record count parameter to URL', async () => {
      const configWithCount = new MockConfiguration({
        feedUrl: 'https://example.com/feed.xml',
        recordCount: 50,
        minimumDateTime: '',
        refreshInterval: 30
      });
      workspaceGetConfigStub.returns(configWithCount);

      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockRssXml);
          if (event === 'end') callback();
        })
      };

      httpsGetStub.callsFake((url, options, callback) => {
        // Verify the URL includes the record count parameter
        expect(url).to.include('n=50');
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
    });
  });

  describe('Tree View Integration', () => {
    beforeEach(async () => {
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockRssXml);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
    });

    it('should create tree items for summary node with posts', () => {
      const summaryNode = {
        label: 'Total: 2 posts fetched and categorized',
        isSummary: true,
        collapsibleState: vscode.TreeItemCollapsibleState.None
      };

      const treeItem = provider.getTreeItem(summaryNode);
      
      expect(treeItem.label).to.equal('Total: 2 posts fetched and categorized');
      expect(treeItem.collapsibleState).to.equal(vscode.TreeItemCollapsibleState.None);
      expect(treeItem.contextValue).to.equal('summary');
      expect(treeItem.iconPath).to.be.instanceOf(vscode.ThemeIcon);
    });

    it('should create tree items for summary node with no posts', () => {
      const summaryNode = {
        label: 'No posts loaded - click refresh to load feeds',
        isSummary: true,
        collapsibleState: vscode.TreeItemCollapsibleState.None
      };

      const treeItem = provider.getTreeItem(summaryNode);
      
      expect(treeItem.label).to.equal('No posts loaded - click refresh to load feeds');
      expect(treeItem.collapsibleState).to.equal(vscode.TreeItemCollapsibleState.None);
      expect(treeItem.contextValue).to.equal('summary');
      expect(treeItem.iconPath).to.be.instanceOf(vscode.ThemeIcon);
    });

    it('should create tree items for categories', () => {
      const categoryNode = {
        label: 'Web Development (2)',
        posts: mockBlogPosts.filter(p => p.category === 'Web Development'),
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded
      };

      const treeItem = provider.getTreeItem(categoryNode);
      
      expect(treeItem.label).to.equal('Web Development (2)');
      expect(treeItem.collapsibleState).to.equal(vscode.TreeItemCollapsibleState.Expanded);
      expect(treeItem.contextValue).to.equal('category');
    });

    it('should create tree items for blog posts', () => {
      const post = mockBlogPosts[0];
      const treeItem = provider.getTreeItem(post);
      
      expect(treeItem.label).to.equal(post.title);
      expect(treeItem.collapsibleState).to.equal(vscode.TreeItemCollapsibleState.None);
      expect(treeItem.contextValue).to.equal('post');
      expect(treeItem.command?.command).to.equal('rssBlogCategorizer.openPost');
    });

    it('should return category nodes as root children', async () => {
      const children = await provider.getChildren();
      
      expect(children).to.be.an('array');
      expect(children.length).to.be.greaterThan(1); // At least summary + 1 category
      expect(children[0]).to.have.property('isSummary', true); // First item is summary
      expect(children[1]).to.have.property('posts'); // Second item is first category
      expect(children[1]).to.have.property('label');
    });

    it('should show appropriate message when no posts are loaded', async () => {
      // Create a new provider instance without loading any feeds
      const emptyProvider = new RSSBlogProvider(mockContext);
      
      const children = await emptyProvider.getChildren();
      
      expect(children).to.be.an('array');
      expect(children.length).to.equal(1); // Only summary node when no posts
      expect(children[0]).to.have.property('isSummary', true);
      const summaryNode = children[0] as any;
      expect(summaryNode.label).to.equal('No posts loaded - click refresh to load feeds');
    });

    it('should return posts as category children', async () => {
      const categoryNode = {
        label: 'Web Development (1)',
        posts: [mockBlogPosts[0]],
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded
      };

      const children = await provider.getChildren(categoryNode);
      
      expect(children).to.deep.equal([mockBlogPosts[0]]);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing categories.json gracefully', async () => {
      fsReadFileStub.rejects(new Error('File not found'));

      // Should not throw error when categories file is missing
      return expect(provider.refresh()).to.be.fulfilled.then(async () => {
        const posts = await provider.getAllPosts();
        expect(posts).to.be.an('array');
      });
    });

    it('should handle malformed XML gracefully', async () => {
      const malformedXml = '<?xml version="1.0"?><invalid><unclosed>';
      
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(malformedXml);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
      const posts = await provider.getAllPosts();
      
      expect(posts).to.have.length(0);
    });

    it('should handle posts without required fields', async () => {
      const incompleteRss = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <description>Post without title or link</description>
              <pubDate>Mon, 25 Sep 2025 10:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`;

      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(incompleteRss);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
      const posts = await provider.getAllPosts();
      
      // Should filter out posts without title/link
      expect(posts).to.have.length(0);
    });
  });

  describe('Loading State', () => {
    it('should set isLoading to true before loading starts', async () => {
      // Setup a delayed response to verify loading state during operation
      let resolveResponse: any;
      const responsePromise = new Promise(resolve => { resolveResponse = resolve; });
      
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          responsePromise.then(() => {
            if (event === 'data') callback(mockRssXml);
            if (event === 'end') callback();
          });
        })
      };
      
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      // Start refresh but don't await it yet
      const refreshPromise = provider.refresh();
      
      // Check loading state immediately after refresh is called
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to let refresh start
      const childrenDuringLoad = await provider.getChildren();
      
      // Should show loading indicator
      expect(childrenDuringLoad).to.have.length(1);
      expect(childrenDuringLoad[0]).to.have.property('isLoadingIndicator', true);
      const loadingNode = childrenDuringLoad[0] as any;
      expect(loadingNode.label).to.equal('Loading feed data...');
      
      // Complete the response
      resolveResponse();
      await refreshPromise;
    });

    it('should display loading indicator in getChildren when loading', async () => {
      // Mock a slow response
      let resolveResponse: any;
      const responsePromise = new Promise(resolve => { resolveResponse = resolve; });
      
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          responsePromise.then(() => {
            if (event === 'data') callback(mockRssXml);
            if (event === 'end') callback();
          });
        })
      };
      
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      const refreshPromise = provider.refresh();
      
      // Wait a bit for loading to start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Get children while loading - should return loading indicator
      const children = await provider.getChildren();
      expect(children).to.have.length(1);
      expect(children[0]).to.deep.include({
        label: 'Loading feed data...',
        isLoadingIndicator: true,
        collapsibleState: vscode.TreeItemCollapsibleState.None
      });
      
      // Complete the response
      resolveResponse();
      await refreshPromise;
    });

    it('should reset isLoading to false after successful load', async () => {
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockRssXml);
          if (event === 'end') callback();
        })
      };
      
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await provider.refresh();
      
      // After successful refresh, should not show loading indicator
      const children = await provider.getChildren();
      expect(children).to.not.be.empty;
      expect(children[0]).to.not.have.property('isLoadingIndicator');
      expect(children[0]).to.have.property('isSummary'); // Should have summary first
      expect(children[1]).to.have.property('posts'); // Should have actual categories
    });

    it('should reset isLoading to false after error occurs', async () => {
      // Simulate a network error
      httpsGetStub.callsFake(() => {
        const request = { on: sinon.stub() };
        setTimeout(() => {
          const errorCallback = request.on.args.find(call => call[0] === 'error')?.[1];
          if (errorCallback) errorCallback(new Error('Network error'));
        }, 0);
        return request;
      });

      await provider.refresh();
      
      // After error, loading state should be cleared
      const children = await provider.getChildren();
      // Should return empty or default categories, not loading indicator
      expect(children.every((c: any) => !c.isLoadingIndicator)).to.be.true;
    });

    it('should create tree item with loading icon for loading indicator', () => {
      const loadingElement: any = {
        label: 'Loading feed data...',
        isLoadingIndicator: true
      };

      const treeItem = provider.getTreeItem(loadingElement);
      
      expect(treeItem.label).to.equal('Loading feed data...');
      expect(treeItem.collapsibleState).to.equal(vscode.TreeItemCollapsibleState.None);
      expect(treeItem.contextValue).to.equal('loading');
      expect(treeItem.iconPath).to.be.instanceOf(vscode.ThemeIcon);
      expect((treeItem.iconPath as vscode.ThemeIcon).id).to.equal('loading~spin');
    });

    it('should fire onDidChangeTreeData event when loading starts', (done) => {
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockRssXml);
          if (event === 'end') callback();
        })
      };
      
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      let eventFiredCount = 0;
      const disposable = provider.onDidChangeTreeData(() => {
        eventFiredCount++;
        if (eventFiredCount === 2) {
          // First event: loading starts, Second event: loading completes
          expect(eventFiredCount).to.equal(2);
          disposable.dispose();
          done();
        }
      });

      provider.refresh();
    });

    it('should fire onDidChangeTreeData event when loading completes', async () => {
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockRssXml);
          if (event === 'end') callback();
        })
      };
      
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      let eventFiredCount = 0;
      const disposable = provider.onDidChangeTreeData(() => {
        eventFiredCount++;
      });

      await provider.refresh();
      
      // Should fire at least twice: once when loading starts, once when it completes
      expect(eventFiredCount).to.be.at.least(2);
      disposable.dispose();
    });

    it('should handle rapid successive refresh calls correctly', async () => {
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event, callback) => {
          if (event === 'data') callback(mockRssXml);
          if (event === 'end') callback();
        })
      };
      
      httpsGetStub.callsFake((url, options, callback) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      // Call refresh multiple times in succession
      const promises = [
        provider.refresh(),
        provider.refresh(),
        provider.refresh()
      ];

      await Promise.all(promises);
      
      // After all refreshes complete, should not be in loading state
      const children = await provider.getChildren();
      expect(children.every((c: any) => !c.isLoadingIndicator)).to.be.true;
    });
  });
});