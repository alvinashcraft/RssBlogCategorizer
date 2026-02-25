---
name: vscode-ext-localization
description: 'Guidelines for proper localization of VS Code extensions, following VS Code extension development guidelines, libraries and good practices'
---

# VS Code extension localization

This skill helps you localize every aspect of VS Code extensions

## When to use this skill

Use this skill when you need to:
- Localize new or existing contributed configurations (settings), commands, menus, views or walkthroughs
- Localize new or existing messages or other string resources contained in extension source code that are displayed to the end user

# Instructions

VS Code localization is composed by three different approaches, depending on the resource that is being localized. When a new localizable resource is created or updated, the corresponding localization for all currently available languages must be created/updated.

1. Configurations like Settings, Commands, Menus, Views, ViewsWelcome, Walkthrough Titles and Descriptions, defined in `package.json`
  -> An exclusive `package.nls.LANGID.json` file, like `package.nls.pt-br.json` of Brazilian Portuguese (`pt-br`) localization
2. Walkthrough content (defined in its own `Markdown` files)
  -> An exclusive `Markdown` file like `walkthrough/someStep.pt-br.md` for Brazilian Portuguese localization
3. Messages and string located in extension source code (JavaScript or TypeScript files)
  -> An exclusive `bundle.l10n.pt-br.json` for Brazilian Portuguese localization

## Practical implementation checklist

When applying localization in a real extension, follow this sequence:

1. Inventory every user-facing string across source, `package.json`, and webviews.
2. Localize `package.json` contributions using `%key%` + `package.nls.json` / `package.nls.LANGID.json`.
3. Localize runtime TypeScript/JavaScript strings using `vscode.l10n.t(...)` + `l10n/bundle.l10n.json` / `l10n/bundle.l10n.LANGID.json`.
4. Localize webviews via placeholder injection from extension host code (webviews cannot directly call `vscode.l10n.t(...)`).
5. Compile and verify both default and translated UI display languages.
6. Validate packaging (`vsce ls` or `vsce package`) to ensure localization files are included exactly once.

## Webview localization guidance

- For inline webview scripts, replace template placeholders in generated HTML before assigning `webview.html`.
- For external webview JS files, do not rely on unresolved `{{...}}` placeholders in `.js` files.
  - Pass localized values through HTML data attributes (or a generated config object) and read them in external JS.
- Keep strict CSP compatibility (avoid introducing inline scripts if CSP disallows them).

## Placeholder and formatting guidance

- Prefer parameterized strings for translatable text, e.g. `vscode.l10n.t('Last saved: {0}', value)`.
- Use stable sentinel placeholders for webview-side replacement when ordering may vary by language (for example, `{time}` in a formatted phrase).
- Keep key/message parity between language files to prevent fallback surprises.

## Packaging and ignore-file guidance

- Ensure `package.json` includes `"l10n": "./l10n"`.
- Ensure `.vscodeignore` keeps root localization files (`!l10n/**`) so runtime bundles are shipped.
- Avoid duplicate packaged assets (for example both `l10n/**` and `dist/l10n/**`) unless intentionally required.

## Verification checklist

- `npm run compile`
- Run the fastest available tests for the project (for example `npm run test:basic`)
- Validate translated command titles, settings descriptions, prompts, notifications, and webview controls
- Validate there are no visible raw placeholders (`%key%`, `{{placeholder}}`) in UI
