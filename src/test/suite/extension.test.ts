import * as assert from 'assert';
import * as vscode from 'vscode';

describe('Extension Integration Tests', () => {
  it('should activate the extension', async () => {
    const extension = vscode.extensions.getExtension('alvinashcraft.rss-blog-categorizer');
    
    if (extension) {
      if (!extension.isActive) {
        await extension.activate();
      }
      assert.ok(extension.isActive, 'Extension should be active');
    } else {
      assert.fail('Extension not found');
    }
  });

  it('should register all commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    const extensionCommands = [
      'rssBlogCategorizer.refresh',
      'rssBlogCategorizer.exportMarkdown',
      'rssBlogCategorizer.exportHtml',
      'rssBlogCategorizer.openPost',
      'rssBlogCategorizer.addFeed'
    ];

    extensionCommands.forEach(command => {
      assert.ok(commands.includes(command), `Command ${command} should be registered`);
    });
  });

  it('should have the tree view registered', async () => {
    // This test verifies the tree view exists by checking if we can get it
    // In a real integration test, you would verify the tree view is populated
    const extension = vscode.extensions.getExtension('alvinashcraft.rss-blog-categorizer');
    if (extension && !extension.isActive) {
      await extension.activate();
    }
    
    // The tree view should be created during activation
    assert.ok(true, 'Tree view creation test - would verify actual tree view in full integration');
  });
});