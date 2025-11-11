# Dev Feed Curator Roadmap

This document outlines planned features and enhancements for future versions of the Dev Feed Curator extension.

## Version 2.5.0 - WordPress Post Management

**Target Release**: Q1 2026

### Primary Features

#### Edit Published Posts

- **Description**: Enable updating already published WordPress posts instead of creating duplicates
- **Implementation**: Leverage stored WordPress post IDs from publication metadata
- **User Experience**:
  - Detect when content corresponds to an existing WordPress post
  - Offer "Update Post" option alongside "Create New Post"
  - Preserve post URL and creation date while updating content

#### Post Synchronization

- **Description**: Sync local changes back to existing WordPress posts
- **Features**:
  - Bidirectional sync between local files and WordPress
  - Conflict detection and resolution
  - Revision tracking

#### Publication History

- **Description**: Track multiple publications and revisions of the same content
- **Features**:
  - Version history in metadata
  - Rollback capabilities
  - Change tracking between versions

### Technical Requirements

- Extend `PublicationMetadata` interface to support revision tracking
- Add WordPress REST API calls for updating existing posts
- Implement conflict resolution UI for when local and remote content differ
- Add publication history management

### Dependencies

- Current publication tracking system (implemented in v2.2.0)
- WordPress REST API for post updates
- Enhanced metadata schema for revision tracking

## Version 3.0.0 - Multi-Platform Publishing

**Target Release**: Q2 2026

### Core Features

#### Multiple Publishing Destinations

- Support for additional platforms beyond WordPress
- Ghost, Medium, Dev.to integration
- Custom webhook publishing

#### Enhanced Content Templates

- Customizable export templates
- Platform-specific formatting
- Advanced placeholder systems

#### Bulk Operations

- Batch publishing to multiple platforms
- Bulk content updates
- Mass category reassignment

## Version 3.5.0 - AI-Powered Enhancements

**Target Release**: Q3 2026

### AI Features

#### AI Content Summarization

- Automatic post summaries generation
- Key points extraction
- Social media snippet creation

#### Smart Categorization

- Machine learning-based category suggestions
- Auto-tagging improvements
- Content similarity detection

#### SEO Optimization

- Automated SEO suggestions
- Meta description generation
- Keyword optimization recommendations

## Long-term Vision (4.0+)

### Content Analytics

- Track post performance across platforms
- Engagement metrics integration
- Content optimization insights

### Collaborative Features

- Team collaboration on content curation
- Review and approval workflows
- Multi-user category management

### Advanced Automation

- Scheduled publishing
- Content pipeline automation
- Smart content filtering based on engagement history

## Contributing to the Roadmap

Have ideas for future features? Consider:

1. **Opening GitHub Issues**: Suggest new features or improvements
2. **Community Feedback**: Participate in discussions about upcoming features
3. **Beta Testing**: Help test new features before public release

## Roadmap Updates

This roadmap is updated quarterly and reflects current development priorities. Features may be moved between versions based on:

- Community feedback and feature requests
- Technical complexity and dependencies
- Integration opportunities with VS Code updates
- WordPress and other platform API changes

---

**Last Updated**: October 2025
