// Magdalena Smart Farming - Global Notification System
// Handles weather alerts and notification badge

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

    connectNotificationWebSocket();
});

function connectNotificationWebSocket() {
    // If Stomp is not loaded yet, wait (SockJS and Stomp are in CDNs in HTML)
    if (typeof Stomp === 'undefined') {
        setTimeout(connectNotificationWebSocket, 500);
        return;
    }

    const socket = new SockJS('http://localhost:8080/ws');
    const client = Stomp.over(socket);
    client.debug = null;

    client.connect({}, () => {
        client.subscribe('/topic/sensors', (message) => {
            const event = JSON.parse(message.body);
            processWeatherEvent(event);
        });
    }, (error) => {
        setTimeout(connectNotificationWebSocket, 5000);
    });
}

function processWeatherEvent(event) {
    // Look for weather/clima sensor data
    if (!event.eventType.includes('SENSOR_READING')) return;
    
    // Check if origin or type is climate
    const isClimate = event.origin?.toLowerCase().includes('clima') || 
                      event.eventType.toLowerCase().includes('clima');
                      
    if (!isClimate) return;

    try {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
        const value = parseFloat(payload.value);
        
        if (isNaN(value)) return;

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
        }
    } catch (e) {
        // Not a valid reading payload
    }
}
