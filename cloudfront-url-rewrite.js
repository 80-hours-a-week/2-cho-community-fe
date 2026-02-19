// CloudFront Function: URL rewrite for S3-hosted MPA
//
// Rewrites clean URLs to actual HTML filenames before the request reaches S3.
// Mirrors serve.json rewrites (local dev) and constants.js HTML_PATHS (JS navigation).
//
// Deployment:
//   1. Go to CloudFront > Functions > Create function
//   2. Paste this code, Publish the function
//   3. Associate with the default cache behavior (/* → S3 origin)
//      Event type: viewer-request
//
// Note: CloudFront Functions use a restricted ES5.1 runtime.
// Use var, not const/let. No arrow functions, no Array.includes().

var REWRITES = {
    '/':             '/user_login.html',
    '/main':         '/post_list.html',
    '/login':        '/user_login.html',
    '/signup':       '/user_signup.html',
    '/write':        '/post_write.html',
    '/detail':       '/post_detail.html',
    '/edit':         '/post_edit.html',
    '/password':     '/user_password.html',
    '/edit-profile': '/user_edit.html',
};

function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Only rewrite paths that have no file extension (clean URLs).
    // Paths with extensions (e.g. /js/app/login.js, /css/style.css) pass through unchanged.
    var hasExtension = uri.lastIndexOf('.') > uri.lastIndexOf('/');
    if (hasExtension) {
        return request;
    }

    // In CloudFront Functions, request.uri is always the bare path — no query string.
    // The query string lives in request.querystring and is forwarded to the origin unchanged.
    if (REWRITES[uri]) {
        request.uri = REWRITES[uri];
    }

    return request;
}
