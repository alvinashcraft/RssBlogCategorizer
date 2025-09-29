export const mockRssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Developer Blog</title>
    <description>A test blog for unit testing</description>
    <item>
      <title>Building React Apps with TypeScript</title>
      <link>https://example.com/react-typescript</link>
      <description>Learn how to build modern React applications using TypeScript for better type safety.</description>
      <pubDate>Mon, 30 Sep 2025 10:00:00 GMT</pubDate>
      <author>John Doe</author>
    </item>
    <item>
      <title>Python Data Science Tutorial</title>
      <link>https://example.com/python-data-science</link>
      <description>A comprehensive guide to data science with Python and pandas.</description>
      <pubDate>Sun, 29 Sep 2025 15:30:00 GMT</pubDate>
      <author>Jane Smith</author>
    </item>
    <item>
      <title>DevOps with Docker and Kubernetes</title>
      <link>https://example.com/devops-k8s</link>
      <description>Setting up CI/CD pipelines with Docker containers and Kubernetes orchestration.</description>
      <pubDate>Sat, 30 Sep 2025 09:15:00 GMT</pubDate>
      <author>Bob Wilson</author>
    </item>
    <item>
      <title>Old Article from Last Year</title>
      <link>https://example.com/old-article</link>
      <description>This is an old article that should be filtered out.</description>
      <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
      <author>Old Author</author>
    </item>
  </channel>
</rss>`;

export const mockAtomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <entry>
    <title>Machine Learning with AI</title>
    <link href="https://example.com/ml-ai" />
    <published>2025-09-30T14:00:00Z</published>
    <summary>Exploring machine learning algorithms and AI applications.</summary>
    <author>
      <name>AI Expert</name>
    </author>
  </entry>
</feed>`;

export const mockDewDropRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Alvin Ashcraft's Blog</title>
    <item>
      <title>Dew Drop &#8211; September 26, 2025 (#4506)</title>
      <link>https://www.alvinashcraft.com/2025/09/26/dew-drop-4506</link>
      <pubDate>Thu, 26 Sep 2025 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Some Other Post</title>
      <link>https://www.alvinashcraft.com/2025/09/25/other-post</link>
      <pubDate>Wed, 29 Sep 2025 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

export const mockCategoriesConfig = {
  categories: {
    "Web Development": {
      titleKeywords: ["react", "vue", "angular", "javascript", "typescript", "html", "css"],
      urlKeywords: ["reactjs", "vuejs"]
    },
    "Data Science": {
      titleKeywords: ["python", "data science", "pandas", "machine learning", "ml"],
      authorKeywords: ["data scientist"]
    },
    "DevOps": {
      titleKeywords: ["docker", "kubernetes", "k8s", "devops", "ci/cd"],
      urlKeywords: ["docker", "kubernetes"]
    },
    "AI": {
      titleKeywords: ["ai", "artificial intelligence", "openai", "copilot"],
      urlKeywords: ["ai", "openai"]
    }
  },
  defaultCategory: "General",
  wholeWordKeywords: ["ai", "ml"]
};

export const mockBooksConfig = {
  books: [
    {
      title: "Clean Code",
      author: "Robert C. Martin",
      description: "A handbook of agile software craftsmanship",
      imageUrl: "https://example.com/clean-code.jpg",
      productUrl: "https://amazon.com/clean-code"
    },
    {
      title: "Design Patterns",
      author: "Gang of Four",
      description: "Elements of reusable object-oriented software",
      imageUrl: "https://example.com/design-patterns.jpg", 
      productUrl: "https://amazon.com/design-patterns"
    }
  ]
};

export interface TestBlogPost {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string;
  source: string;
  author: string;
}

export const mockBlogPosts: TestBlogPost[] = [
  {
    title: "Building React Apps with TypeScript",
    link: "https://example.com/react-typescript", 
    description: "Learn how to build modern React applications using TypeScript for better type safety.",
    pubDate: "Mon, 30 Sep 2025 10:00:00 GMT",
    category: "Web Development",
    source: "Test Developer Blog",
    author: "John Doe"
  },
  {
    title: "Python Data Science Tutorial",
    link: "https://example.com/python-data-science",
    description: "A comprehensive guide to data science with Python and pandas.",
    pubDate: "Sun, 29 Sep 2025 15:30:00 GMT", 
    category: "Data Science",
    source: "Test Developer Blog",
    author: "Jane Smith"
  },
  {
    title: "DevOps with Docker and Kubernetes",
    link: "https://example.com/devops-k8s",
    description: "Setting up CI/CD pipelines with Docker containers and Kubernetes orchestration.",
    pubDate: "Sat, 30 Sep 2025 09:15:00 GMT",
    category: "DevOps", 
    source: "Test Developer Blog",
    author: "Bob Wilson"
  }
];