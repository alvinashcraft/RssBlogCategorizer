import * as https from 'https';

/**
 * Minimal JSON GET helper used by the Morning Dew v1 API fallback paths.
 * Kept dependency-free to avoid pulling in a new module for one-off calls.
 */
export function fetchJson(url: string, timeoutMs: number = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
        const options = {
            timeout: timeoutMs,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };

        const request = https.get(url, options, (response) => {
            if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                response.resume();
                return;
            }
            let data = '';
            response.on('data', chunk => { data += chunk; });
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(err);
                }
            });
        });

        request.on('error', reject);
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

/**
 * Returns true when the configured WordPress blog URL's hostname is exactly
 * alvinashcraft.com (or a subdomain thereof). Avoids substring false matches
 * like `notalvinashcraft.com`.
 */
export function isAlvinAshcraftHost(blogUrl: string | undefined | null): boolean {
    if (!blogUrl) {
        return false;
    }
    const trimmed = blogUrl.trim();
    if (!trimmed) {
        return false;
    }
    try {
        // URL parsing requires a scheme; tolerate users who entered a bare host.
        const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        const host = new URL(withScheme).hostname.toLowerCase();
        return host === 'alvinashcraft.com' || host.endsWith('.alvinashcraft.com');
    } catch {
        return false;
    }
}
