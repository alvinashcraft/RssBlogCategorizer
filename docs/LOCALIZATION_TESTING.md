# Quick Testing Guide for Localization

This guide provides quick steps to test the newly added language support.

## Quick Language Switching

1. **Open Command Palette**: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. **Type**: `Configure Display Language`
3. **Select** the language you want to test:
   - `de` - German (Deutsch)
   - `es` - Spanish (Español)
   - `fr` - French (Français)
   - `it` - Italian (Italiano)
   - `pt` - Portuguese (Português)
   - `en` - English (back to default)
4. **Reload VS Code** when prompted

## Quick Smoke Test

After changing language, verify these key areas:

### 1. Explorer Panel (5 seconds)
- Look for "Dev Blog Posts" (or translated name) in Explorer sidebar
- Click refresh button
- Verify the view title and refresh button tooltip appear in the selected language (category names themselves may remain unchanged)

### 2. Command Palette (10 seconds)
- Open Command Palette
- Type "Dev Feed"
- Verify all commands appear with translated labels:
  - Refresh
  - Export as Markdown
  - Export as HTML
  - Set RSS Feed
  - Set WordPress Credentials
  - Publish to WordPress

### 3. Settings (10 seconds)
- Open Settings (`Ctrl+,` or `Cmd+,`)
- Search for "Dev Feed Curator"
- Verify setting descriptions appear in selected language

### 4. Error Message (5 seconds)
- Try to export without loading posts
- Verify error message appears in selected language:
  - English: "No posts available to export. Please refresh the feed first."
  - German: "Keine Beiträge zum Exportieren verfügbar. Bitte aktualisieren Sie zuerst den Feed."
  - French: "Aucun article disponible pour l'exportation. Veuillez d'abord actualiser le flux."
  - Italian: "Nessun post disponibile per l'esportazione. Aggiorna prima il feed."
  - Portuguese: "Nenhum post disponível para exportar. Atualize o feed primeiro."
  - Spanish: "No hay publicaciones disponibles para exportar. Actualice la fuente primero."

## Full Test Checklist

For comprehensive testing, see `LOCALIZATION_IMPLEMENTATION_PLAN.md` in the docs folder.

## Language Codes Reference

| Language | VS Code Code | File Suffix |
|----------|--------------|-------------|
| English | `en` | (default) |
| German | `de` | `.de.json` |
| Spanish | `es` | `.es.json` |
| French | `fr` | `.fr.json` |
| Italian | `it` | `.it.json` |
| Portuguese | `pt` | `.pt.json` |

## Common Test Commands

```bash
# Validate all localization JSON files
node -e "['de','es','fr','it','pt'].forEach(l=>{try{JSON.parse(require('fs').readFileSync(\`package.nls.\${l}.json\`))}catch(e){console.error(\`❌ \${l}:\`,e.message)}}); console.log('✅ All package files valid')"

# Count keys in each language
node -e "console.log(['de','es','fr','it','pt'].map(l=>l.toUpperCase()+': '+Object.keys(JSON.parse(require('fs').readFileSync(\`package.nls.\${l}.json\`))).length).join(', '))"

# Check for missing translations (returns empty if all complete)
node -e "const en=JSON.parse(require('fs').readFileSync('l10n/bundle.l10n.json'));['de','es','fr','it','pt'].forEach(l=>{const t=JSON.parse(require('fs').readFileSync(\`l10n/bundle.l10n.\${l}.json\`));Object.keys(en).forEach(k=>{if(!t[k])console.log(\`❌ \${l}: Missing '\${k}'\`)})})"
```

## Expected Results

All tests should show:
- ✅ Consistent key counts across all languages
- ✅ All messages display in the selected language  
- ✅ Placeholders like `{0}` are replaced with actual values
- ✅ Technical terms (WordPress, RSS, etc.) remain in English
- ✅ No English fallback text appears

## Reporting Issues

If you find translation issues:

1. Note the language code (de, fr, it, pt)
2. Note the exact location (command name, setting, message)
3. Note what was expected vs. what appeared
4. Check the relevant `.json` file for the incorrect translation
5. Submit a fix or report the issue

## Files to Check If Issues Found

For package-level issues (commands, settings):
- `package.nls.de.json`
- `package.nls.fr.json`
- `package.nls.it.json`
- `package.nls.pt.json`

For runtime issues (messages, prompts):
- `l10n/bundle.l10n.de.json`
- `l10n/bundle.l10n.fr.json`
- `l10n/bundle.l10n.it.json`
- `l10n/bundle.l10n.pt.json`
