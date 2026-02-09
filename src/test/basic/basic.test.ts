import { expect } from 'chai';
import { BlogPost } from '../../rssProvider';
import type { WordPressPost } from '../../wordpressManager';

describe('Basic Tests', () => {
  describe('BlogPost Interface', () => {
    it('should create a valid blog post object', () => {
      const post: BlogPost = {
        title: 'Test Post',
        link: 'https://example.com/test',
        description: 'A test post',
        pubDate: '2025-09-28T10:00:00Z',
        category: 'Test',
        source: 'Test Blog',
        author: 'Test Author'
      };

      expect(post.title).to.equal('Test Post');
      expect(post.link).to.equal('https://example.com/test');
      expect(post.description).to.equal('A test post');
      expect(post.category).to.equal('Test');
      expect(post.source).to.equal('Test Blog');
      expect(post.author).to.equal('Test Author');
    });

    it('should validate required properties exist', () => {
      const post: BlogPost = {
        title: 'Required Fields Test',
        link: 'https://example.com/required',
        description: 'Testing required fields',
        pubDate: '2025-09-28T10:00:00Z',
        category: 'General',
        source: 'Test',
        author: 'Author'
      };

      expect(post).to.have.property('title');
      expect(post).to.have.property('link');
      expect(post).to.have.property('description');
      expect(post).to.have.property('pubDate');
      expect(post).to.have.property('category');
      expect(post).to.have.property('source');
      expect(post).to.have.property('author');
    });
  });

  describe('Date Handling', () => {
    it('should parse valid date strings', () => {
      const dateString = '2025-09-28T10:00:00Z';
      const parsed = new Date(dateString);
      
      expect(parsed.getTime()).to.not.be.NaN;
      expect(parsed.getFullYear()).to.equal(2025);
      expect(parsed.getMonth()).to.equal(8); // September is month 8 (0-indexed)
      expect(parsed.getDate()).to.equal(28);
    });

    it('should handle RSS date format', () => {
      const rssDate = 'Mon, 28 Sep 2025 10:00:00 GMT';
      const parsed = new Date(rssDate);
      
      expect(parsed.getTime()).to.not.be.NaN;
      expect(parsed.getFullYear()).to.equal(2025);
    });

    it('should detect invalid dates', () => {
      const invalidDate = new Date('invalid-date-string');
      
      expect(isNaN(invalidDate.getTime())).to.be.true;
    });

    it('should handle future date filtering logic', () => {
      const now = new Date();
      const bufferMinutes = 30;
      const maxDateTime = new Date(now.getTime() + (bufferMinutes * 60 * 1000));
      
      // Post within buffer (should be included)
      const nearFutureDate = new Date(now.getTime() + (15 * 60 * 1000)); // 15 minutes
      expect(nearFutureDate <= maxDateTime).to.be.true;
      
      // Post beyond buffer (should be excluded)
      const farFutureDate = new Date(now.getTime() + (60 * 60 * 1000)); // 60 minutes
      expect(farFutureDate > maxDateTime).to.be.true;
      
      // Current time (should be included)
      expect(now <= maxDateTime).to.be.true;
    });
  });

  describe('String Utilities', () => {
    it('should handle HTML stripping logic', () => {
      const htmlString = '<p>Hello <b>world</b></p>';
      const stripped = htmlString.replace(/<[^>]*>/g, '');
      
      expect(stripped).to.equal('Hello world');
    });

    it('should handle URL validation', () => {
      const validUrl = 'https://example.com/feed.xml';
      const invalidUrl = 'not-a-url';
      
      expect(() => new URL(validUrl)).to.not.throw();
      expect(() => new URL(invalidUrl)).to.throw();
    });

    it('should handle category keyword matching', () => {
      const title = 'Building React Apps with TypeScript';
      const keywords = ['react', 'typescript', 'javascript'];
      
      const matches = keywords.filter(keyword => 
        title.toLowerCase().includes(keyword.toLowerCase())
      );
      
      expect(matches).to.include('react');
      expect(matches).to.include('typescript');
      expect(matches).to.have.length(2);
    });

    it('should properly escape HTML special characters', () => {
      // Mirrors the escapeHtml function from exportManager.ts
      function escapeHtml(text: string): string {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      // Test basic special characters
      expect(escapeHtml('Hello & World')).to.equal('Hello &amp; World');
      expect(escapeHtml('<script>alert("xss")</script>')).to.equal('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escapeHtml("It's a test")).to.equal('It&#39;s a test');

      // Test author name with curly braces and special characters
      const authorWithBraces = 'Jiří {x2} Činčura';
      const escaped = escapeHtml(authorWithBraces);
      
      // Curly braces should NOT be escaped (they're safe in HTML)
      expect(escaped).to.equal('Jiří {x2} Činčura');
      // Verify special Czech characters (ř, í, č, ů) are preserved
      expect(escaped).to.include('ř');
      expect(escaped).to.include('í');
      expect(escaped).to.include('Č');
      expect(escaped).to.include('č');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate record count ranges', () => {
      const minCount = 10;
      const maxCount = 500;
      const testCount = 100;
      
      expect(testCount).to.be.at.least(minCount);
      expect(testCount).to.be.at.most(maxCount);
    });

    it('should handle refresh interval bounds', () => {
      const defaultInterval = 30;
      const testInterval = 60;
      
      expect(defaultInterval).to.be.a('number');
      expect(testInterval).to.be.greaterThan(0);
    });
  });

  describe('WordPress URL Normalization', () => {
    // Test the normalization logic that WordPressManager.normalizeBlogUrl applies
    function normalizeBlogUrl(blogUrl: string): string {
      let normalized = blogUrl.trim();
      if (!normalized.match(/^https?:\/\//i)) {
        normalized = `https://${normalized}`;
      }
      normalized = normalized.replace(/\/+$/, '');
      return normalized;
    }

    it('should add https:// when no protocol is present', () => {
      expect(normalizeBlogUrl('www.example.com')).to.equal('https://www.example.com');
      expect(normalizeBlogUrl('example.com')).to.equal('https://example.com');
    });

    it('should preserve existing https:// protocol', () => {
      expect(normalizeBlogUrl('https://www.example.com')).to.equal('https://www.example.com');
    });

    it('should preserve existing http:// protocol', () => {
      expect(normalizeBlogUrl('http://www.example.com')).to.equal('http://www.example.com');
    });

    it('should remove trailing slashes', () => {
      expect(normalizeBlogUrl('https://www.example.com/')).to.equal('https://www.example.com');
      expect(normalizeBlogUrl('https://www.example.com///')).to.equal('https://www.example.com');
    });

    it('should trim whitespace', () => {
      expect(normalizeBlogUrl('  https://www.example.com  ')).to.equal('https://www.example.com');
    });

    it('should produce a valid URL for URL constructor', () => {
      const normalized = normalizeBlogUrl('www.alvinashcraft.com');
      expect(() => new URL('/wp-json/wp/v2/posts', normalized)).to.not.throw();
      
      const url = new URL('/wp-json/wp/v2/posts', normalized);
      expect(url.hostname).to.equal('www.alvinashcraft.com');
      expect(url.pathname).to.equal('/wp-json/wp/v2/posts');
    });

    it('should handle bare domain without www', () => {
      const normalized = normalizeBlogUrl('alvinashcraft.com');
      const url = new URL('/wp-json/wp/v2/posts', normalized);
      expect(url.hostname).to.equal('alvinashcraft.com');
    });
  });

  describe('WordPress Post Interface', () => {
    it('should create a valid WordPress post object', () => {
      const post: WordPressPost = {
        title: 'Test Post',
        content: '<p>Hello world</p>',
        status: 'publish',
        dateCreated: new Date(),
        categories: ['Development'],
        tags: ['.net', 'typescript']
      };

      expect(post.title).to.equal('Test Post');
      expect(post.content).to.include('Hello world');
      expect(post.status).to.equal('publish');
      expect(post.categories).to.have.length(1);
      expect(post.tags).to.have.length(2);
    });

    it('should allow draft status', () => {
      const post: WordPressPost = {
        title: 'Draft Post',
        content: '<p>Draft content</p>',
        status: 'draft'
      };

      expect(post.status).to.equal('draft');
      expect(post.categories).to.be.undefined;
      expect(post.tags).to.be.undefined;
    });
  });

  describe('Redirect Same-Origin Credential Check', () => {
    /**
     * Helper that mirrors the same-origin logic used in makeHttpRequest
     * to decide whether credentials should be forwarded on redirect.
     */
    function shouldForwardCredentials(originalUrlStr: string, redirectUrlStr: string): boolean {
      const url = new URL(originalUrlStr);
      const redirectUrl = new URL(redirectUrlStr);

      const originalPort = url.port || (url.protocol === 'https:' ? '443' : '80');
      const redirectPort = redirectUrl.port || (redirectUrl.protocol === 'https:' ? '443' : '80');

      return (
        url.protocol === redirectUrl.protocol &&
        url.hostname === redirectUrl.hostname &&
        originalPort === redirectPort
      );
    }

    it('should forward credentials for same-origin redirect (same host, same protocol)', () => {
      expect(shouldForwardCredentials(
        'https://myblog.com/wp-json/wp/v2/posts',
        'https://myblog.com/wp-json/wp/v2/posts?id=1'
      )).to.be.true;
    });

    it('should forward credentials when default ports match implicitly', () => {
      // Both HTTPS with no explicit port → both default to 443
      expect(shouldForwardCredentials(
        'https://myblog.com/path',
        'https://myblog.com/other-path'
      )).to.be.true;

      // Both HTTP with no explicit port → both default to 80
      expect(shouldForwardCredentials(
        'http://myblog.com/path',
        'http://myblog.com/other-path'
      )).to.be.true;
    });

    it('should NOT forward credentials when hostname differs', () => {
      expect(shouldForwardCredentials(
        'https://myblog.com/wp-json/wp/v2/posts',
        'https://evil.com/steal-creds'
      )).to.be.false;
    });

    it('should NOT forward credentials when protocol changes (https → http)', () => {
      expect(shouldForwardCredentials(
        'https://myblog.com/wp-json/wp/v2/posts',
        'http://myblog.com/wp-json/wp/v2/posts'
      )).to.be.false;
    });

    it('should NOT forward credentials when port differs', () => {
      expect(shouldForwardCredentials(
        'https://myblog.com/wp-json/wp/v2/posts',
        'https://myblog.com:8443/wp-json/wp/v2/posts'
      )).to.be.false;
    });

    it('should forward credentials when explicit port matches default port', () => {
      // Explicit :443 on the redirect should still match implicit HTTPS default
      expect(shouldForwardCredentials(
        'https://myblog.com/path',
        'https://myblog.com:443/path'
      )).to.be.true;
    });

    it('should NOT forward credentials for subdomain redirect', () => {
      expect(shouldForwardCredentials(
        'https://myblog.com/path',
        'https://www.myblog.com/path'
      )).to.be.false;
    });
  });
});