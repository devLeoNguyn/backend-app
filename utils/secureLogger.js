/**
 * 🔒 SECURE LOGGING UTILITY
 * Utility để log thông tin an toàn, ẩn sensitive data
 */

/**
 * Redact sensitive information trong object
 * @param {any} data - Data to redact
 * @returns {any} - Redacted data
 */
function redactSensitiveData(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const redacted = JSON.parse(JSON.stringify(data));
    
    // List of sensitive keys to redact
    const sensitiveKeys = [
        'streamUid',
        'hlsManifestUrl',
        'uri',
        'url',
        'apiToken',
        'accountId',
        'accountHash',
        'password',
        'token',
        'secret',
        'key',
        'authorization',
        'cookie',
        'session'
    ];

    function redactObject(obj) {
        if (Array.isArray(obj)) {
            return obj.map(item => redactObject(item));
        }
        
        if (obj && typeof obj === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                // Check if key is sensitive
                const isSensitive = sensitiveKeys.some(sensitiveKey => 
                    key.toLowerCase().includes(sensitiveKey.toLowerCase())
                );
                
                if (isSensitive) {
                    if (typeof value === 'string') {
                        // Show first 8 chars for debugging, redact rest
                        result[key] = value.length > 8 ? 
                            `${value.substring(0, 8)}...***[REDACTED]` : 
                            '[REDACTED]';
                    } else {
                        result[key] = '[REDACTED]';
                    }
                } else {
                    result[key] = redactObject(value);
                }
            }
            return result;
        }
        
        return obj;
    }

    return redactObject(redacted);
}

/**
 * Safe console.log cho production
 * @param {string} message - Log message
 * @param {any} data - Data to log
 */
function secureLog(message, data = null) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (data) {
        const redactedData = redactSensitiveData(data);
        console.log(message, redactedData);
    } else {
        console.log(message);
    }
    
    // In production, also send to monitoring service if needed
    if (isProduction && data) {
        // TODO: Send to monitoring service (e.g., CloudWatch, DataDog, etc.)
        // monitoringService.log(message, redactedData);
    }
}

/**
 * Safe console.error cho sensitive errors
 * @param {string} message - Error message
 * @param {Error|any} error - Error object or data
 */
function secureError(message, error = null) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (error) {
        let errorData = error;
        
        // If it's an Error object, extract safe properties
        if (error instanceof Error) {
            errorData = {
                message: error.message,
                name: error.name,
                stack: isProduction ? '[REDACTED]' : error.stack
            };
        }
        
        const redactedError = redactSensitiveData(errorData);
        console.error(message, redactedError);
    } else {
        console.error(message);
    }
}

/**
 * Development-only logging
 * @param {string} message - Log message
 * @param {any} data - Data to log
 */
function devLog(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] ${message}`, data);
    }
}

/**
 * Redact URLs để ẩn sensitive parts
 * @param {string} url - URL to redact
 * @returns {string} - Redacted URL
 */
function redactUrl(url) {
    if (!url || typeof url !== 'string') {
        return url;
    }
    
    try {
        const urlObj = new URL(url);
        
        // Redact Cloudflare Stream UIDs
        if (url.includes('cloudflarestream.com')) {
            return url.replace(/\/[a-f0-9]{32}/gi, '/***[UID-REDACTED]');
        }
        
        // Redact query parameters that might be sensitive
        if (urlObj.search) {
            urlObj.search = '?***[PARAMS-REDACTED]';
        }
        
        return urlObj.toString();
    } catch {
        // If URL parsing fails, just redact the whole thing
        return '[INVALID-URL-REDACTED]';
    }
}

module.exports = {
    secureLog,
    secureError,
    devLog,
    redactSensitiveData,
    redactUrl
};
