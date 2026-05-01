/**
 * Wrapper for fetch that includes the JWT token in the Authorization header.
 */
export async function authFetch(url, options = {}) {
    const session = JSON.parse(localStorage.getItem('magdalena_session') || '{}');
    const token = session.token;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401 || response.status === 403) {
        console.warn('Session expired or unauthorized. Redirecting to login...');
        localStorage.removeItem('magdalena_session');
        window.location.href = '/index.html';
        return null;
    }

    return response;
}
