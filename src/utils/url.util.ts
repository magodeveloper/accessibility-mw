/**
 * URL validation utilities
 */

/**
 * Validates if a string is a valid HTTP or HTTPS URL
 * @param url - The URL string to validate
 * @returns true if the URL is valid, false otherwise
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObject = new URL(url);
    return urlObject.protocol === 'http:' || urlObject.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL by ensuring it has a protocol
 * @param url - The URL to normalize
 * @returns The normalized URL
 */
export function normalizeUrl(url: string): string {
  if (!url) {
    return '';
  }

  // If it already has a protocol, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Default to https for domain-like strings
  if (url.includes('.') && !url.includes(' ')) {
    return `https://${url}`;
  }

  return url;
}

/**
 * Extracts the domain from a URL
 * @param url - The URL to extract domain from
 * @returns The domain or empty string if invalid
 */
export function extractDomain(url: string): string {
  if (!validateUrl(url)) {
    return '';
  }

  try {
    const urlObject = new URL(url);
    return urlObject.hostname;
  } catch {
    return '';
  }
}
