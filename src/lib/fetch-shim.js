// Fetch shim to avoid overwriting window.fetch
const fetch = typeof window !== 'undefined' ? window.fetch : undefined;
const Headers = typeof window !== 'undefined' ? window.Headers : undefined;
const Request = typeof window !== 'undefined' ? window.Request : undefined;
const Response = typeof window !== 'undefined' ? window.Response : undefined;

export { fetch as default, fetch, Headers, Request, Response };
