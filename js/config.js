// js/config.js
// API 설정 파일

import { HTML_PATHS } from './constants.js';

// Environment detection
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// API Base URL - IMPORTANT: Update this with your EC2 backend URL for production
export const API_BASE_URL = IS_LOCAL
    ? "http://127.0.0.1:8000"
    : "http://YOUR_EC2_IP_OR_DOMAIN";  // TODO: Replace with actual EC2 public IP (e.g., "http://13.55.10.192")

/**
 * Resolve navigation path to actual file for S3 deployment
 * @param {string} path - Clean URL path (e.g., '/login')
 * @returns {string} - Actual HTML file path (e.g., '/user_login.html')
 */
export function resolveNavPath(path) {
    // For local development with nginx or serve, use clean URLs
    if (IS_LOCAL) {
        return path;
    }

    // For S3 production, map to actual HTML files
    // Extract base path without query string
    const basePath = path.split('?')[0];
    const queryString = path.includes('?') ? path.substring(path.indexOf('?')) : '';

    return (HTML_PATHS[basePath] || path) + queryString;
}
