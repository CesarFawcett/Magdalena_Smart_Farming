// Magdalena Smart Farming - Global Notification System
// Handles weather alerts and notification badge

let climateHistory = [];
const MAX_HISTORY = 10;

document.addEventListener('DOMContentLoaded', () => {
    // Inject Weather Alert Modal HTML if it doesn't exist
    if (!document.getElementById('weather-alert-modal')) {
        const modalHtml = `
            <div id="weather-alert-modal" class="weather-alert-modal hidden">
                <div class="weather-alert-card">
                    <div class="alert-icon-wrapper">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                            <path d="M16 14v6"></path>
                            <path d="M8 14v6"></path>
                            <path d="M12 16v6"></path>
                        </svg>
                    </div>
                    <h2>¡Alerta de Lluvia Intensa!</h2>
                    <p>Se ha detectado una probabilidad de lluvia del <span id="rain-prob-value">75</span>% en la zona de cultivo. Recomendamos resguardar equipos sensibles y verificar drenajes.</p>
                    <div class="alert-footer">
                        <button id="btn-close-weather" class="btn-weather-ok">ENTENDIDO</button>
                        <label class="dont-show-again">
                            <input type="checkbox" id="chk-dont-show-rain">
                            No volver a mostrar hoy
                        </label>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add listener for close button
        const btnClose = document.getElementById('btn-close-weather');
        btnClose.addEventListener('click', () => {
            const chk = document.getElementById('chk-dont-show-rain');
            if (chk.checked) {
                const today = new Date().toDateString();
                localStorage.setItem('hideRainAlert', today);
            }
            document.getElementById('weather-alert-modal').classList.add('hidden');
        });
    }

    // Inject History Modal if it doesn't exist
    if (!document.getElementById('climate-history-modal')) {
        const historyModalHtml = `
        <div id="climate-history-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Historial de Clima</h2>
                    <button id="close-climate-history" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="climate-history-list" class="history-list">
                        <!-- Entries will be injected here -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="btn-close-history" style="width: 100%;">CERRAR</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', historyModalHtml);

        // History Modal Listeners
        const historyModal = document.getElementById('climate-history-modal');
        const closeHistory = document.getElementById('close-climate-history');
        const btnCloseHistory = document.getElementById('btn-close-history');
        
        const hideHistory = () => historyModal.classList.add('hidden');
        if (closeHistory) closeHistory.onclick = hideHistory;
        if (btnCloseHistory) btnCloseHistory.onclick = hideHistory;

        // Bell Click Listener
        const bellBtn = document.querySelector('.notification-btn');
        if (bellBtn) {
            bellBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                renderClimateHistory();
                historyModal.classList.remove('hidden');
                // Remove badge active state
                const badge = bellBtn.querySelector('.notif-badge');
                if (badge) badge.classList.remove('active');
            });
        }
    }

    connectNotificationWebSocket();
});

function connectNotificationWebSocket() {
    // If Stomp is not loaded yet, wait (SockJS and Stomp are in CDNs in HTML)
    if (typeof Stomp === 'undefined') {
        setTimeout(connectNotificationWebSocket, 500);
        return;
    }

    if (localStorage.getItem('magdalena_manual_offline') === 'true') {
        updateGlobalStatus(false);
        console.warn('Manual Offline Mode active. Skipping WebSocket connection.');
        return;
    }

    const socket = new SockJS('http://localhost:8080/ws');
    const client = Stomp.over(socket);
    client.debug = null;

    client.connect({}, () => {
        updateGlobalStatus(true);
        client.subscribe('/topic/sensors', (message) => {
            const event = JSON.parse(message.body);
            processWeatherEvent(event);
        });
    }, (error) => {
        updateGlobalStatus(false);
        setTimeout(connectNotificationWebSocket, 5000);
    });
}

function updateGlobalStatus(isOnline) {
    const statusIndicator = document.getElementById('system-status');
    if (statusIndicator) {
        statusIndicator.className = 'status-indicator ' + (isOnline ? 'online' : 'offline');
        statusIndicator.innerHTML = `<span class="status-icon"></span> ${isOnline ? 'ONLINE' : 'OFFLINE'}`;
    }
}

function processWeatherEvent(event) {
    console.log('Evento recibido:', event);
    // Look for weather/clima sensor data
    // Process climate-related events regardless of type
    
    // Check if origin or type is climate (very inclusive)
    const origin = (event.origin || '').toLowerCase();
    const type = (event.eventType || '').toLowerCase();
    
    const isClimate = origin.includes('clima') || 
                      type.includes('clima') ||
                      type.includes('lluvia') ||
                      type.includes('manual'); // Loosen to catch manual readings if they mention climate in origin
                      
    if (!isClimate && !origin.includes('norte')) return; // Extra check for user's specific test case

    try {
        let payload = event.payload || event; // Try payload first, then the event itself
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload);
            } catch(e) {
                // If not JSON, use it as the value
                payload = { value: payload };
            }
        }
        
        let valueStr = payload.value || event.value; // Check both possibilities
        let value = parseFloat(valueStr);
        if (isNaN(value)) {
            // Try parsing the value directly if payload.value didn't work
            value = parseFloat(payload);
        }
        
        console.log(`Clima detectado: Origen=${event.origin}, Valor=${value}`);
        
        if (isNaN(value)) return;

        // Add to History
        climateHistory.unshift({
            time: new Date().toLocaleTimeString(),
            origin: event.origin || 'Sensor Clima',
            value: value
        });
        if (climateHistory.length > MAX_HISTORY) climateHistory.pop();

        const badge = document.querySelector('.notif-badge');

        // Logic based on probability (assuming value is percentage)
        if (value >= 55 && value < 75) {
            // Trigger bell alert
            if (badge) badge.classList.add('active');
            console.log('Weather Alert (55%): Rain probability rising.');
        } 
        else if (value >= 75) {
            // Trigger bell alert
            if (badge) badge.classList.add('active');
            
            // Trigger Modal if not suppressed
            const suppressionDate = localStorage.getItem('hideRainAlert');
            const today = new Date().toDateString();
            
            if (suppressionDate !== today) {
                const modal = document.getElementById('weather-alert-modal');
                const valSpan = document.getElementById('rain-prob-value');
                if (modal && valSpan) {
                    valSpan.textContent = value.toFixed(0);
                    modal.classList.remove('hidden');
                }
            }
        } else {
            // Reset badge if prob is low (optional, but good for UX)
            // if (badge) badge.classList.remove('active');
        }
    } catch (e) {
        // Not a valid reading payload
    }
}
function renderClimateHistory() {
    const list = document.getElementById('climate-history-list');
    if (!list) return;

    if (climateHistory.length === 0) {
        list.innerHTML = '<div class="empty-history" style="text-align:center; padding:20px; color:#94a3b8;">No hay registros de clima recientes.</div>';
        return;
    }

    list.innerHTML = climateHistory.map(entry => `
        <div class="history-item" style="background: rgba(255,255,255,0.05); padding: 12px 16px; border-radius: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div class="history-left">
                <div class="history-origin" style="color: white; font-weight: 600; font-size: 14px;">${entry.origin}</div>
                <div class="history-time" style="color: #94a3b8; font-size: 11px;">${entry.time}</div>
            </div>
            <div class="history-value" style="font-weight: 800; font-size: 16px; color: ${entry.value >= 75 ? '#ef4444' : (entry.value >= 55 ? '#f59e0b' : '#10b981')}">
                ${entry.value.toFixed(0)}%
            </div>
        </div>
    `).join('');
}
