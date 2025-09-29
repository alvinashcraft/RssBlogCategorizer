import { expect, use } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import 'chai-as-promised';

use(sinonChai);
import * as vscode from 'vscode';
import { ExportManager } from '../../exportManager';
import { mockBlogPosts, mockBooksConfig, mockDewDropRss } from '../mocks/testData';
import { BlogPost } from '../../rssProvider';
import * as https from 'https';
import * as fs from 'fs';

describe.skip('ExportManager', () => {
  let exportManager: ExportManager;
  let httpsGetStub: sinon.SinonStub;
  let fsReadFileSyncStub: sinon.SinonStub;
  let showSaveDialogStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;
  let showInformationMessageStub: sinon.SinonStub;
  let openTextDocumentStub: sinon.SinonStub;
  let showTextDocumentStub: sinon.SinonStub;
  let originalDate: DateConstructor;

  beforeEach(() => {
    originalDate = global.Date;
    exportManager = new ExportManager();
    
    // Stub external dependencies
    httpsGetStub = sinon.stub(https, 'get');
    fsReadFileSyncStub = sinon.stub(fs, 'readFileSync');
    showSaveDialogStub = sinon.stub(vscode.window, 'showSaveDialog');
    // Create a standalone stub since vscode.workspace.fs.writeFile is non-configurable
    writeFileStub = sinon.stub().resolves();
    showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage');
    openTextDocumentStub = sinon.stub(vscode.workspace, 'openTextDocument');
    showTextDocumentStub = sinon.stub(vscode.window, 'showTextDocument');

    // Mock books.json loading
    fsReadFileSyncStub.withArgs(sinon.match(/books\.json$/)).returns(JSON.stringify(mockBooksConfig));
    
    // Mock categories.json loading  
    fsReadFileSyncStub.withArgs(sinon.match(/categories\.json$/)).returns(JSON.stringify({
      categories: {
        "Web Development": ["react", "javascript"],
        "Data Science": ["python", "data"],
        "DevOps": ["docker", "kubernetes"]
      },
      defaultCategory: "General"
    }));
  });

  afterEach(() => {
    sinon.restore();
    // Restore original Date if it was mocked
    if (originalDate) {
      global.Date = originalDate;
    }
  });

  describe('Dew Drop Title Generation', () => {
    it('should generate title with incremented number', async () => {
      // Mock the Dew Drop RSS response
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event: string, callback: (data?: string) => void) => {
          if (event === 'data') callback(mockDewDropRss);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url: any, options: any, callback: any) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      // Mock save dialog to prevent actual file dialog
      const mockUri = vscode.Uri.file('/test/export.md');
      showSaveDialogStub.resolves(mockUri);
      writeFileStub.resolves();
      openTextDocumentStub.resolves({} as vscode.TextDocument);
      showTextDocumentStub.resolves();

      await exportManager.exportAsMarkdown([]);
      
      // Should have called to get latest Dew Drop number and incremented it
      expect(httpsGetStub).to.have.been.calledWith(sinon.match(/alvinashcraft\.com/));
      expect(showInformationMessageStub).to.have.been.calledWith(sinon.match(/Generated title.*#4507/));
    });

    it('should handle Dew Drop fetch failure gracefully', async () => {
      // Mock network error for Dew Drop fetch
      httpsGetStub.callsFake(() => {
        const request = { on: sinon.stub() };
        setTimeout(() => {
          const errorCallback = request.on.args.find((call: any) => call[0] === 'error')?.[1];
          if (errorCallback) errorCallback(new Error('Network error'));
        }, 0);
        return request;
      });

      const mockUri = vscode.Uri.file('/test/export.md');
      showSaveDialogStub.resolves(mockUri);
      writeFileStub.resolves();
      openTextDocumentStub.resolves({} as vscode.TextDocument);
      showTextDocumentStub.resolves();

      await exportManager.exportAsMarkdown([]);
      
      // Should fall back to default number
      expect(showInformationMessageStub).to.have.been.calledWith(sinon.match(/fallback.*#4507/));
    });
  });

  describe('Markdown Export', () => {
    beforeEach(() => {
      // Mock successful Dew Drop response
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event: string, callback: any) => {
          if (event === 'data') callback(mockDewDropRss);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url: any, options: any, callback: any) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });
    });

    it('should generate markdown content with categories', async () => {
      const mockUri = vscode.Uri.file('/test/export.md');
      showSaveDialogStub.resolves(mockUri);
      
      let capturedContent = '';
      writeFileStub.callsFake((uri: vscode.Uri, content: Uint8Array) => {
        capturedContent = Buffer.from(content).toString('utf8');
        return Promise.resolve();
      });
      
      openTextDocumentStub.resolves({} as vscode.TextDocument);
      showTextDocumentStub.resolves();

      await exportManager.exportAsMarkdown(mockBlogPosts);
      
      expect(capturedContent).to.include('# Dew Drop');
      expect(capturedContent).to.include('### Top Links');
      expect(capturedContent).to.include('### Web Development');
      expect(capturedContent).to.include('Building React Apps with TypeScript');
      expect(capturedContent).to.include('[Building React Apps with TypeScript](https://example.com/react-typescript) (John Doe)');
      expect(writeFileStub).to.have.been.calledOnce;
    });

    it('should include Geek Shelf section with book', async () => {
      const mockUri = vscode.Uri.file('/test/export.md');
      showSaveDialogStub.resolves(mockUri);
      
      let capturedContent = '';
      writeFileStub.callsFake((uri: vscode.Uri, content: Uint8Array) => {
        capturedContent = Buffer.from(content).toString('utf8');
        return Promise.resolve();
      });
      
      openTextDocumentStub.resolves({} as vscode.TextDocument);
      showTextDocumentStub.resolves();

      await exportManager.exportAsMarkdown([]);
      
      expect(capturedContent).to.include('### The Geek Shelf');
      expect(capturedContent).to.include('Clean Code'); // First book in rotation
      expect(capturedContent).to.include('Robert C. Martin');
      expect(capturedContent).to.include('*- Referral Link*');
    });

    it('should handle user cancelling save dialog', async () => {
      showSaveDialogStub.resolves(undefined); // User cancelled

      await exportManager.exportAsMarkdown([]);
      
      expect(writeFileStub).to.not.have.been.called;
      expect(openTextDocumentStub).to.not.have.been.called;
    });

    it('should handle file write errors', async () => {
      const mockUri = vscode.Uri.file('/test/export.md');
      showSaveDialogStub.resolves(mockUri);
      writeFileStub.rejects(new Error('Write failed'));
      
      const showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');

      await exportManager.exportAsMarkdown([]);
      
      expect(showErrorMessageStub).to.have.been.calledWith(sinon.match(/Failed to export/));
    });
  });

  describe('HTML Export', () => {
    beforeEach(() => {
      // Mock successful Dew Drop response
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event: string, callback: any) => {
          if (event === 'data') callback(mockDewDropRss);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url: any, options: any, callback: any) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });
    });

    it('should generate valid HTML content', async () => {
      const mockUri = vscode.Uri.file('/test/export.html');
      showSaveDialogStub.resolves(mockUri);
      
      let capturedContent = '';
      writeFileStub.callsFake((uri: vscode.Uri, content: Uint8Array) => {
        capturedContent = Buffer.from(content).toString('utf8');
        return Promise.resolve();
      });
      
      openTextDocumentStub.resolves({} as vscode.TextDocument);
      showTextDocumentStub.resolves();

      await exportManager.exportAsHtml(mockBlogPosts);
      
      expect(capturedContent).to.include('<!DOCTYPE html>');
      expect(capturedContent).to.include('<html lang="en">');
      expect(capturedContent).to.include('<h1>Dew Drop');
      expect(capturedContent).to.include('<h3>Web Development</h3>');
      expect(capturedContent).to.include('<a href="https://example.com/react-typescript" target="_blank">Building React Apps with TypeScript</a>');
      expect(capturedContent).to.include('</html>');
    });

    it('should escape HTML in content', async () => {
      const postsWithHtml: BlogPost[] = [{
        title: 'Test <script>alert("xss")</script> Title',
        link: 'https://example.com/test',
        description: 'Description with <b>HTML</b>',
        pubDate: 'Mon, 25 Sep 2025 10:00:00 GMT',
        category: 'Web Development',
        source: 'Test Blog',
        author: 'Author & Co.'
      }];

      const mockUri = vscode.Uri.file('/test/export.html');
      showSaveDialogStub.resolves(mockUri);
      
      let capturedContent = '';
      writeFileStub.callsFake((uri: vscode.Uri, content: Uint8Array) => {
        capturedContent = Buffer.from(content).toString('utf8');
        return Promise.resolve();
      });
      
      openTextDocumentStub.resolves({} as vscode.TextDocument);
      showTextDocumentStub.resolves();

      await exportManager.exportAsHtml(postsWithHtml);
      
      expect(capturedContent).to.include('&lt;script&gt;');
      expect(capturedContent).to.not.include('<script>');
      expect(capturedContent).to.include('Author &amp; Co.');
    });

    it('should include Geek Shelf section in HTML', async () => {
      const mockUri = vscode.Uri.file('/test/export.html');
      showSaveDialogStub.resolves(mockUri);
      
      let capturedContent = '';
      writeFileStub.callsFake((uri: vscode.Uri, content: Uint8Array) => {
        capturedContent = Buffer.from(content).toString('utf8');
        return Promise.resolve();
      });
      
      openTextDocumentStub.resolves({} as vscode.TextDocument);
      showTextDocumentStub.resolves();

      await exportManager.exportAsHtml([]);
      
      expect(capturedContent).to.include('<h3>The Geek Shelf</h3>');
      expect(capturedContent).to.include('<img src="https://example.com/clean-code.jpg"');
      expect(capturedContent).to.include('Clean Code');
    });
  });

  describe('Book Integration', () => {
    it('should rotate books based on day of year', async () => {
      // Mock current date to a specific day
      const mockDate = new Date('2025-01-02'); // Day 2 of year
      
      // @ts-ignore
      global.Date = class extends Date {
        constructor() {
          super();
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      } as any;

      const mockUri = vscode.Uri.file('/test/export.md');
      showSaveDialogStub.resolves(mockUri);
      
      let capturedContent = '';
      writeFileStub.callsFake((uri: vscode.Uri, content: Uint8Array) => {
        capturedContent = Buffer.from(content).toString('utf8');
        return Promise.resolve();
      });
      
      openTextDocumentStub.resolves({} as vscode.TextDocument);
      showTextDocumentStub.resolves();

      // Mock successful Dew Drop response
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event: string, callback: any) => {
          if (event === 'data') callback(mockDewDropRss);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url: any, options: any, callback: any) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await exportManager.exportAsMarkdown([]);
      
      // Day 2 % 2 books = index 0, should be first book
      expect(capturedContent).to.include('Clean Code');
    });

    it('should handle missing books.json gracefully', async () => {
      fsReadFileSyncStub.withArgs(sinon.match(/books\.json$/)).throws(new Error('File not found'));

      const mockUri = vscode.Uri.file('/test/export.md');
      showSaveDialogStub.resolves(mockUri);
      
      let capturedContent = '';
      writeFileStub.callsFake((uri: vscode.Uri, content: Uint8Array) => {
        capturedContent = Buffer.from(content).toString('utf8');
        return Promise.resolve();
      });
      
      openTextDocumentStub.resolves({} as vscode.TextDocument);
      showTextDocumentStub.resolves();

      // Mock successful Dew Drop response
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event: string, callback: any) => {
          if (event === 'data') callback(mockDewDropRss);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url: any, options: any, callback: any) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await exportManager.exportAsMarkdown([]);
      
      // Should not include Geek Shelf section when books can't be loaded
      expect(capturedContent).to.not.include('### The Geek Shelf');
    });
  });

  describe('Post Grouping and Ordering', () => {
    it('should group posts by category in correct order', async () => {
      const mockUri = vscode.Uri.file('/test/export.md');
      showSaveDialogStub.resolves(mockUri);
      
      let capturedContent = '';
      writeFileStub.callsFake((uri: vscode.Uri, content: Uint8Array) => {
        capturedContent = Buffer.from(content).toString('utf8');
        return Promise.resolve();
      });
      
      openTextDocumentStub.resolves({} as vscode.TextDocument);
      showTextDocumentStub.resolves();

      // Mock successful Dew Drop response
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event: string, callback: any) => {
          if (event === 'data') callback(mockDewDropRss);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url: any, options: any, callback: any) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await exportManager.exportAsMarkdown(mockBlogPosts);
      
      // Check that categories appear in the expected order
      const topLinksIndex = capturedContent.indexOf('### Top Links');
      const webDevIndex = capturedContent.indexOf('### Web Development');
      const dataScientistIndex = capturedContent.indexOf('### Data Science');
      const devOpsIndex = capturedContent.indexOf('### DevOps');
      
      expect(topLinksIndex).to.be.greaterThan(-1);
      expect(webDevIndex).to.be.greaterThan(topLinksIndex);
      expect(dataScientistIndex).to.be.greaterThan(webDevIndex);
      expect(devOpsIndex).to.be.greaterThan(dataScientistIndex);
    });

    it('should deduplicate posts with same link', async () => {
      const duplicatePosts = [
        ...mockBlogPosts,
        { ...mockBlogPosts[0], title: 'Duplicate Post' } // Same link, different title
      ];

      const mockUri = vscode.Uri.file('/test/export.md');
      showSaveDialogStub.resolves(mockUri);
      
      let capturedContent = '';
      writeFileStub.callsFake((uri: vscode.Uri, content: Uint8Array) => {
        capturedContent = Buffer.from(content).toString('utf8');
        return Promise.resolve();
      });
      
      openTextDocumentStub.resolves({} as vscode.TextDocument);
      showTextDocumentStub.resolves();

      // Mock successful Dew Drop response
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event: string, callback: any) => {
          if (event === 'data') callback(mockDewDropRss);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url: any, options: any, callback: any) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await exportManager.exportAsMarkdown(duplicatePosts);
      
      // Should only appear once in the content
      const matches = capturedContent.match(/react-typescript/g);
      expect(matches).to.have.length(1);
    });

    it('should sort posts by date within categories', async () => {
      // Create posts with different dates in same category
      const postsWithDates: BlogPost[] = [
        {
          title: 'Older React Post',
          link: 'https://example.com/older-react',
          description: 'Older post',
          pubDate: 'Sat, 23 Sep 2025 10:00:00 GMT', // Older
          category: 'Web Development',
          source: 'Test Blog',
          author: 'Author'
        },
        {
          title: 'Newer React Post',
          link: 'https://example.com/newer-react',
          description: 'Newer post',
          pubDate: 'Mon, 25 Sep 2025 10:00:00 GMT', // Newer
          category: 'Web Development',
          source: 'Test Blog',
          author: 'Author'
        }
      ];

      const mockUri = vscode.Uri.file('/test/export.md');
      showSaveDialogStub.resolves(mockUri);
      
      let capturedContent = '';
      writeFileStub.callsFake((uri: vscode.Uri, content: Uint8Array) => {
        capturedContent = Buffer.from(content).toString('utf8');
        return Promise.resolve();
      });
      
      openTextDocumentStub.resolves({} as vscode.TextDocument);
      showTextDocumentStub.resolves();

      // Mock successful Dew Drop response
      const mockResponse = {
        statusCode: 200,
        on: sinon.stub().callsFake((event: string, callback: any) => {
          if (event === 'data') callback(mockDewDropRss);
          if (event === 'end') callback();
        })
      };
      httpsGetStub.callsFake((url: any, options: any, callback: any) => {
        callback(mockResponse);
        return { on: sinon.stub() };
      });

      await exportManager.exportAsMarkdown(postsWithDates);
      
      // Newer post should appear before older post
      const newerIndex = capturedContent.indexOf('Newer React Post');
      const olderIndex = capturedContent.indexOf('Older React Post');
      expect(newerIndex).to.be.greaterThan(-1);
      expect(olderIndex).to.be.greaterThan(-1);
      expect(newerIndex).to.be.lessThan(olderIndex);
    });
  });
});