const API_BASE_URL = import.meta.env.VITE_API_URL;

// ------------------------------------------------------------------
// DEV-ONLY BYPASS
// If VITE_BYPASS_AUTH is set to 'true' in your local .env, a dummy
// token is returned so any frontend logic that checks "is there a
// token present" (route guards, header attachment, etc.) still works,
// without needing a real CRIS-issued token. This only affects your
// local Vite dev server — it has no effect on a production build
// unless you deliberately set that env var there too, so don't.
// ------------------------------------------------------------------
const DEV_BYPASS = import.meta.env.VITE_BYPASS_AUTH === 'true';
const DEV_BYPASS_TOKEN = 'dev-bypass-token';

/**
 * Retrieves the access token from sessionStorage or falls back to localStorage.
 */
export const getAccessToken = () => {
  if (DEV_BYPASS) {
    return DEV_BYPASS_TOKEN;
  }

  try {
    const localData = localStorage.getItem('GetStorage');
    if (localData) {
      const parsed = JSON.parse(localData);
      if (parsed && parsed.token) {
        return parsed.token;
      }
    }
  } catch (e) {
    console.error('Error parsing GetStorage from localStorage:', e);
  }

  // Fallback to sessionStorage
  return sessionStorage.getItem('Authorization');
};

/**
 * Saves the given token to sessionStorage.
 */
export const setAccessToken = (token) => {
  if (token) {
    sessionStorage.setItem('Authorization', token);
  } else {
    sessionStorage.removeItem('Authorization');
  }
};

/**
 * Standard fetch wrapper for API calls
 */
export const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const accessToken = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { 'X-Auth-Token': accessToken }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // Check if the backend sent a new token in the response headers
    const newToken = response.headers.get('X-Auth-Token') || response.headers.get('Authorization');
    if (newToken) {
      setAccessToken(newToken);
    }

    const data = await response.json();

    // Check if the response was successful (e.g. 200-299)
    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new Event('token-expired'));
      }
      throw new Error(data.message || `API Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`[API Call Failed] ${url}`, error);
    throw error;
  }
};

/**
 * Advanced stream fetch wrapper for NDJSON
 */
export const fetchStreamApi = async (endpoint, onChunk, onComplete, onError, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const accessToken = getAccessToken();
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/x-ndjson',
        ...(accessToken && { 'X-Auth-Token': accessToken }),
        ...options.headers,
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new Event('token-expired'));
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `Stream API Error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("ReadableStream not supported by the browser");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // The last line might be incomplete, so keep it in the buffer
      buffer = lines.pop() || "";

      const batch = [];
      for (const line of lines) {
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.stream_error) {
              throw new Error(parsed.stream_error);
            }
            batch.push(parsed);
          } catch (e) {
            console.error("Error parsing NDJSON stream chunk:", e, line);
          }
        }
      }

      if (batch.length > 0) {
        onChunk(batch);
      }
    }

    // Flush any remaining complete objects
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        if (parsed.stream_error) {
          throw new Error(parsed.stream_error);
        }
        onChunk([parsed]);
      } catch (e) { }
    }

    if (onComplete) onComplete();

  } catch (error) {
    console.error(`[Stream API Failed] ${url}`, error);
    if (onError) onError(error);
  }
};