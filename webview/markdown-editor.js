// Markdown Editor Script - Extracted from inline for CSP compliance
(function() {
    const vscode = acquireVsCodeApi();
    const textarea = document.getElementById('markdown-textarea');
    const theme = document.body.dataset.theme; // Theme passed from extension
    let isDirty = false;
    
    // Check if EasyMDE loaded successfully
    if (typeof EasyMDE === 'undefined') {
        showError('Failed to load the markdown editor. Please check your internet connection and try again.');
        return;
    }
    
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-text">
                <strong>Editor Loading Error</strong>
                <p>${message}</p>
                <button onclick="window.location.reload()">Retry</button>
            </div>
        `;
        document.body.innerHTML = '';
        document.body.appendChild(errorDiv);
    }
    
    // Initialize EasyMDE
    try {
        const easyMDE = new EasyMDE({
            element: textarea,
            autofocus: true,
            autosave: {
                enabled: false
            },
            spellChecker: false,
            status: ['lines', 'words', 'cursor'],
            toolbar: [
                'bold', 'italic', 'heading', '|',
                'quote', 'unordered-list', 'ordered-list', '|',
                'link', 'image', 'code', '|',
                'preview', 'side-by-side', 'fullscreen', '|',
                'guide'
            ],
            shortcuts: {
                toggleFullScreen: null // Disable F11
            }
        });
        
        // Hide loading indicator
        document.getElementById('loading').style.display = 'none';
        
        // Initialize state
        const previousState = vscode.getState();
        if (previousState && previousState.content) {
            easyMDE.value(previousState.content);
            isDirty = previousState.isDirty || false;
        }
        
        // Track changes
        easyMDE.codemirror.on('change', function() {
            isDirty = true;
            vscode.setState({ 
                content: easyMDE.value(),
                isDirty: true 
            });
        });
        
        // Handle Ctrl+S to save
        easyMDE.codemirror.on('keydown', function(cm, event) {
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                document.getElementById('save-btn').click();
            }
        });
        
        // Function to update last saved timestamp
        function updateLastSaved() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                second: '2-digit',
                hour12: true 
            });
            document.getElementById('last-saved').textContent = `Last saved: ${timeString}`;
        }
        
        // Save button handler
        document.getElementById('save-btn').addEventListener('click', function() {
            const content = easyMDE.value();
            vscode.postMessage({
                command: 'save',
                content: content
            });
            isDirty = false;
            vscode.setState({ content: content, isDirty: false });
            updateLastSaved();
        });
        
        // Save and close button handler
        document.getElementById('save-close-btn').addEventListener('click', function() {
            const content = easyMDE.value();
            vscode.postMessage({
                command: 'saveAndClose',
                content: content
            });
        });
        
        // Save and publish button handler
        document.getElementById('save-publish-btn').addEventListener('click', function() {
            const content = easyMDE.value();
            vscode.postMessage({
                command: 'saveAndPublish',
                content: content
            });
            updateLastSaved();
        });
        
        // Cancel button handler - no confirmation, just close
        document.getElementById('cancel-btn').addEventListener('click', function() {
            vscode.postMessage({ command: 'cancel' });
        });
        
        // Handle messages from extension
        window.addEventListener('message', function(event) {
            const message = event.data;
            switch (message.command) {
                case 'updateContent':
                    easyMDE.value(message.content);
                    vscode.setState({ content: message.content, isDirty: false });
                    isDirty = false;
                    break;
                    
                case 'focusEditor':
                    easyMDE.codemirror.focus();
                    break;
            }
        });
        
        // Focus editor on load
        easyMDE.codemirror.focus();
    } catch (error) {
        showError('Failed to initialize the markdown editor: ' + error.message);
    }
})();
