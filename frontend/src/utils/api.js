import { handleMockRequest } from './mockApi.js';

/**
 * Checks if the app is running as a native APK using Capacitor or similar detection.
 */
export function isNativeApp() {
    const hasCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNative;
    const isAndroidLocal = typeof navigator !== 'undefined' && navigator.userAgent.match(/Android/i) && 
                           (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:');
    const isForceMock = typeof window !== 'undefined' && (window.location.search.includes('mock=true') || localStorage.getItem('magdalena_force_mock') === 'true');
    
    return !!(hasCapacitor || isAndroidLocal || isForceMock);
}

/**
 * Resolves the dynamic base URL of the backend server.
 * Checks localStorage first, then falls back to localhost if running on PC.
 */
export function getBaseUrl() {
    const savedUrl = localStorage.getItem('magdalena_api_base_url');
    if (savedUrl) {
        return savedUrl.endsWith('/') ? savedUrl.slice(0, -1) : savedUrl;
    }
    
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:8080';
    }
    
    return 'http://localhost:8080';
}

/**
 * Resolves any local backend URL string to point to the resolved dynamic base URL.
 */
export function resolveUrl(url) {
    if (!url) return url;
    const base = getBaseUrl();
    if (url.startsWith('http://localhost:8080')) {
        return url.replace('http://localhost:8080', base);
    }
    return url;
}

/**
 * Wrapper for fetch that includes the JWT token in the Authorization header.
 * Automatically resolves the backend URL dynamically.
 */
export async function authFetch(url, options = {}) {
    const resolvedUrl = resolveUrl(url);
    const session = JSON.parse(localStorage.getItem('magdalena_session') || '{}');
    const token = session.token;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Intercept native mobile requests to use mock data
    if (isNativeApp()) {
        console.info('Native APK detected: using mock data for request ->', url);
        return handleMockRequest(resolvedUrl, options);
    }

    const response = await fetch(resolvedUrl, {
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

/**
 * Injects a premium glassmorphism server configuration modal into the DOM.
 */
export function injectServerConfigModal() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('server-config-modal')) return;

    const currentBaseUrl = getBaseUrl();

    const modalHtml = `
    <div id="server-config-modal" class="server-config-modal hidden">
        <div class="server-config-card">
            <div class="server-config-header">
                <h2>Configurar Servidor</h2>
                <button id="btn-close-server-config" class="server-config-close">&times;</button>
            </div>
            <p class="server-config-description">
                Especifica la dirección IP y puerto del servidor backend de Magdalena Smart Farming para conectar esta aplicación.
            </p>
            <div class="form-group">
                <label for="server-api-url" style="display:block; font-size:11px; font-weight:600; color:#555; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Dirección del Servidor</label>
                <input type="url" id="server-api-url" value="${currentBaseUrl}" placeholder="e.g. http://192.168.1.15:8080" style="width:100%; padding:12px; border-radius:8px; border:1px solid rgba(0,0,0,0.1); margin-bottom:16px; font-size:15px;" />
            </div>
            <div id="connection-status-pill" class="connection-status-pill"></div>
            <button id="btn-test-connection" class="btn-test-connection">Probar Conexión</button>
            <div class="server-config-actions">
                <button id="btn-cancel-server-config" class="btn-secondary-config">Cancelar</button>
                <button id="btn-save-server-config" class="btn-primary" style="margin-top:0; padding:12px; font-weight:600; background:#0B3921;">Guardar</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Bind event handlers
    const modal = document.getElementById('server-config-modal');
    const closeBtn = document.getElementById('btn-close-server-config');
    const cancelBtn = document.getElementById('btn-cancel-server-config');
    const saveBtn = document.getElementById('btn-save-server-config');
    const testBtn = document.getElementById('btn-test-connection');
    const input = document.getElementById('server-api-url');
    const statusPill = document.getElementById('connection-status-pill');

    const hide = () => {
        modal.classList.add('hidden');
        statusPill.className = 'connection-status-pill';
        statusPill.textContent = '';
    };

    if (closeBtn) closeBtn.onclick = hide;
    if (cancelBtn) cancelBtn.onclick = hide;

    if (testBtn) {
        testBtn.onclick = async () => {
            statusPill.className = 'connection-status-pill loading';
            statusPill.textContent = 'Probando conexión...';
            
            let testUrl = input.value.trim();
            if (!testUrl) {
                statusPill.className = 'connection-status-pill error';
                statusPill.textContent = 'Por favor, ingresa una URL válida.';
                return;
            }

            try {
                const normalizedUrl = testUrl.endsWith('/') ? testUrl.slice(0, -1) : testUrl;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(`${normalizedUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'test@magdalena.ag', password: 'test' }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.status === 200 || response.status === 401 || response.status === 400) {
                    statusPill.className = 'connection-status-pill success';
                    statusPill.textContent = '¡Conexión Exitosa con el Servidor!';
                } else {
                    statusPill.className = 'connection-status-pill error';
                    statusPill.textContent = `Error del servidor (Código ${response.status}).`;
                }
            } catch (error) {
                statusPill.className = 'connection-status-pill error';
                statusPill.textContent = 'No se pudo conectar. Verifica la IP y puerto.';
            }
        };
    }

    if (saveBtn) {
        saveBtn.onclick = () => {
            let value = input.value.trim();
            if (!value) return;

            // Simple validation to prepend http:// if omitted
            if (!value.startsWith('http://') && !value.startsWith('https://')) {
                value = 'http://' + value;
            }

            localStorage.setItem('magdalena_api_base_url', value);
            hide();
            window.location.reload();
        };
    }
}

/**
 * Public method to display the server configuration modal.
 */
export function openServerConfigModal() {
    injectServerConfigModal();
    const modal = document.getElementById('server-config-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Dynamically injects the "Ajustes de IP" button in the sidebar footer if it exists.
 */
export function injectSidebarConfigButton() {
    if (typeof document === 'undefined') return;
    const sidebarFooter = document.querySelector('.sidebar-footer');
    if (sidebarFooter && !document.getElementById('btn-config-server')) {
        const btnHtml = `
        <button id="btn-config-server" class="footer-item" style="background:none; border:none; width:100%; text-align:left; cursor:pointer; display:flex; align-items:center; gap:8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Ajustes de IP
        </button>
        `;
        
        const logoutBtn = sidebarFooter.querySelector('#btn-logout');
        if (logoutBtn) {
            logoutBtn.insertAdjacentHTML('afterend', btnHtml);
        } else {
            sidebarFooter.insertAdjacentHTML('afterbegin', btnHtml);
        }

        const btn = document.getElementById('btn-config-server');
        if (btn) {
            btn.onclick = (e) => {
                e.preventDefault();
                openServerConfigModal();
            };
        }
    }
}

// Automatically inject elements on DOMContentLoaded
if (typeof window !== 'undefined') {
    const runInjections = () => {
        injectServerConfigModal();
        injectSidebarConfigButton();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runInjections);
    } else {
        runInjections();
    }
}
