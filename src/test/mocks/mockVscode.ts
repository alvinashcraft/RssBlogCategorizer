import * as vscode from 'vscode';
import * as path from 'path';

export class MockExtensionContext implements vscode.ExtensionContext {
  public subscriptions: vscode.Disposable[] = [];
  public workspaceState: vscode.Memento;
  public globalState: vscode.Memento & { setKeysForSync(keys: readonly string[]): void; };
  public secrets: vscode.SecretStorage;
  public extensionUri: vscode.Uri;
  public extensionPath: string;
  public environmentVariableCollection: vscode.GlobalEnvironmentVariableCollection;
  public storageUri: vscode.Uri | undefined;
  public storagePath: string | undefined;
  public globalStorageUri: vscode.Uri;
  public globalStoragePath: string;
  public logUri: vscode.Uri;
  public logPath: string;
  public extensionMode: vscode.ExtensionMode = vscode.ExtensionMode.Test;
  public extension: vscode.Extension<any>;
  public languageModelAccessInformation: vscode.LanguageModelAccessInformation;

  constructor(testResourcesPath?: string) {
    // Set up paths for testing
    this.extensionPath = testResourcesPath || path.join(__dirname, '..', '..', '..');
    this.extensionUri = vscode.Uri.file(this.extensionPath);
    this.globalStoragePath = path.join(this.extensionPath, 'test-global-storage');
    this.globalStorageUri = vscode.Uri.file(this.globalStoragePath);
    this.logPath = path.join(this.extensionPath, 'test-logs');
    this.logUri = vscode.Uri.file(this.logPath);

    // Mock memento storage
    this.workspaceState = new MockMemento();
    this.globalState = new MockGlobalMemento();
    
    // Mock other properties
    this.secrets = new MockSecretStorage();
    this.environmentVariableCollection = new MockEnvironmentVariableCollection();
    this.extension = {} as vscode.Extension<any>;
    this.languageModelAccessInformation = {} as vscode.LanguageModelAccessInformation;
  }

  asAbsolutePath(relativePath: string): string {
    return path.join(this.extensionPath, relativePath);
  }
}

class MockMemento implements vscode.Memento {
  private storage = new Map<string, any>();

  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.storage.has(key) ? this.storage.get(key) : defaultValue;
  }

  async update(key: string, value: any): Promise<void> {
    this.storage.set(key, value);
  }

  keys(): readonly string[] {
    return Array.from(this.storage.keys());
  }
}

class MockGlobalMemento extends MockMemento {
  setKeysForSync(keys: readonly string[]): void {
    // Mock implementation - do nothing for tests
  }
}

class MockEnvironmentVariableCollection implements vscode.GlobalEnvironmentVariableCollection {
  persistent = false;
  description = 'Mock Environment Variable Collection';
  
  replace(variable: string, value: string): void {}
  append(variable: string, value: string): void {}
  prepend(variable: string, value: string): void {}
  get(variable: string): vscode.EnvironmentVariableMutator | undefined { return undefined; }
  forEach(callback: (variable: string, mutator: vscode.EnvironmentVariableMutator, collection: vscode.EnvironmentVariableCollection) => any): void {}
  delete(variable: string): void {}
  clear(): void {}
  
  getScoped(scope: vscode.EnvironmentVariableScope): vscode.EnvironmentVariableCollection {
    return {} as vscode.EnvironmentVariableCollection;
  }
  
  [Symbol.iterator](): Iterator<[variable: string, mutator: vscode.EnvironmentVariableMutator]> {
    return [][Symbol.iterator]();
  }
}

// Mock configuration for testing
export class MockConfiguration implements vscode.WorkspaceConfiguration {
  private config = new Map<string, any>();

  constructor(defaults: Record<string, any> = {}) {
    Object.entries(defaults).forEach(([key, value]) => {
      this.config.set(key, value);
    });
  }

  get<T>(section: string): T | undefined;
  get<T>(section: string, defaultValue: T): T;
  get<T>(section: string, defaultValue?: T): T | undefined {
    return this.config.has(section) ? this.config.get(section) : defaultValue;
  }

  has(section: string): boolean {
    return this.config.has(section);
  }

  inspect<T>(section: string): any {
    return {
      key: section,
      defaultValue: undefined,
      globalValue: this.config.get(section),
      workspaceValue: undefined,
      workspaceFolderValue: undefined
    };
  }

  async update(section: string, value: any, configurationTarget?: vscode.ConfigurationTarget): Promise<void> {
    this.config.set(section, value);
  }

  readonly [key: string]: any;
}

class MockSecretStorage implements vscode.SecretStorage {
  private storage = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.storage.get(key);
  }

  async store(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  onDidChange: vscode.Event<vscode.SecretStorageChangeEvent> = new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event;
}