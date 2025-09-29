import { expect, use } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

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
      expect(children.length).to.be.greaterThan(0);
      expect(children[0]).to.have.property('posts');
      expect(children[0]).to.have.property('label');
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
});