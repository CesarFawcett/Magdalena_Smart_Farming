import { getSession, clearSession } from './utils/db';
import { authFetch } from './utils/api';

const btnLogout = document.getElementById('btn-logout');
const btnShowAlerts = document.getElementById('btn-show-alerts');
const searchInput = document.getElementById('search-input');

let allParcels = [];
let globalEvents = [];
let globalSensors = [];
let chartInstances = {};
let stompClient = null;

// Profile Modal Elements
const profileModal = document.getElementById('profile-modal');
const btnOpenProfile = document.getElementById('btn-open-profile');
const btnCloseProfile = document.getElementById('close-profile-modal');
const btnCancelProfile = document.getElementById('cancel-profile-btn');
const profileForm = document.getElementById('profile-form');

// Check Session on Load
window.addEventListener('DOMContentLoaded', async () => {
    const session = await getSession();
    if (!session) {
        window.location.href = '/index.html';
        return;
    }
    console.log('Active session:', session.email);
    
    // Update user name from session
    if (session.name) {
        document.getElementById('user-display-name').textContent = session.name;
    }
    
    // Load and Render Parcels
    loadParcels();
    loadStats();
    
    // Connect to WebSockets
    connectWebSocket();

    // Event Delegation for Lot Actions
    const container = document.getElementById('lots-container');
    if (container) {
        container.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-delete');
            if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                deleteParcela(id);
                return;
            }
            
            const detailsBtn = e.target.closest('.btn-details');
            if (detailsBtn) {
                const id = detailsBtn.getAttribute('data-id');
                viewDetails(id);
                return;
            }
        });
    }
});

function connectWebSocket() {
    const socket = new SockJS('http://localhost:8080/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // Disable logging for cleaner console

    stompClient.connect({}, (frame) => {
        console.log('Connected to WebSocket');
        
        // Indicate connection status
        const localDbIndicator = document.querySelector('.status-indicator.localdb');
        if (localDbIndicator) {
            localDbIndicator.style.color = '#10B981';
            localDbIndicator.querySelector('.status-icon').style.backgroundColor = '#10B981';
        }

        stompClient.subscribe('/topic/sensors', (message) => {
            const event = JSON.parse(message.body);
            console.log('Real-time sensor update:', event);
            
            flashSyncIndicator();
            
            // Fast refresh: Update data and charts only, without re-rendering HTML
            updateDataAndCharts();
            loadStats();
        });
    }, (error) => {
        console.error('WebSocket error:', error);
        startPolling();
    });
}

async function updateDataAndCharts() {
    try {
        const [parcelasRes, eventsRes] = await Promise.all([
            authFetch('http://localhost:8080/api/parcelas'),
            authFetch('http://localhost:8080/api/events')
        ]);
        
        allParcels = await parcelasRes.json();
        globalEvents = await eventsRes.json();
        // Sort ascending: past to present
        globalEvents.sort((a, b) => new Date(a.occurredOn) - new Date(b.occurredOn));

        // Update each parcel's stats and chart in the DOM without re-rendering the whole card
        allParcels.forEach(p => {
            const card = document.querySelector(`.lot-card[data-id="${p.id}"]`);
            if (card) {
                // Update specific values (Humidity, pH)
                const humValue = card.querySelector('.stat-item:nth-child(1) .stat-value');
                if (humValue) humValue.textContent = `${p.currentHumidity?.toFixed(1) || '0.0'}%`;
                
                const phValue = card.querySelector('.stat-item:nth-child(2) .stat-value');
                if (phValue) phValue.textContent = `${p.currentPh?.toFixed(1) || '0.0'}`;

                const tempValue = card.querySelector('.stat-item:nth-child(3) .stat-value');
                if (tempValue) tempValue.textContent = `${(p.currentTemperature !== null && p.currentTemperature !== undefined) ? p.currentTemperature.toFixed(1) : '24.0'}°C`;

                // Re-init the chart (it will destroy and recreate, but the canvas remains)
                // Determine current chart type from header
                const header = document.getElementById(`chart-header-${p.id}`);
                const currentType = header?.textContent.split(': ')[1]?.split(' (')[0] || 'Humedad';
                
                // Link sensors if not linked
                const parcelSensors = globalSensors.filter(s => 
                    s.parcelas && s.parcelas.some(parcel => String(parcel.id) === String(p.id))
                );
                p.sensores = parcelSensors;

                initChart(p, globalEvents, currentType);
            }
        });
    } catch (e) { console.error('Fast refresh error:', e); }
}

function flashSyncIndicator() {
    const topBar = document.querySelector('.top-bar');
    if (topBar) {
        topBar.style.borderBottomColor = '#10b981';
        setTimeout(() => topBar.style.borderBottomColor = 'rgba(255,255,255,0.05)', 800);
    }
}

function startPolling() {
    setInterval(() => {
        updateDataAndCharts();
        loadStats();
    }, 10000);
}

// Search and Filter Listeners
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allParcels.filter(p => 
        p.nombre.toLowerCase().includes(term) || 
        (p.tipoSuelo && p.tipoSuelo.toLowerCase().includes(term))
    );
    renderParcels(filtered, globalEvents, globalSensors);
});

btnShowAlerts.addEventListener('click', (e) => {
    e.preventDefault();
    const filtered = allParcels.filter(p => 
        p.estado !== 'Activa' || (p.currentHealth !== null && p.currentHealth < 50)
    );
    
    if (filtered.length === 0) {
        alert('No hay parcelas con alertas en este momento.');
    } else {
        renderParcels(filtered, globalEvents, globalSensors);
    }
});

async function loadParcels() {
    try {
        const [parcelasRes, eventsRes, sensorsRes] = await Promise.all([
            authFetch('http://localhost:8080/api/parcelas'),
            authFetch('http://localhost:8080/api/events'),
            authFetch('http://localhost:8080/api/sensors')
        ]);
        
        if (!parcelasRes || !eventsRes || !sensorsRes) return;
        
        allParcels = await parcelasRes.json();
        globalEvents = await eventsRes.json();
        globalSensors = await sensorsRes.json();

        // Sort ascending
        globalEvents.sort((a, b) => new Date(a.occurredOn) - new Date(b.occurredOn));

        if (allParcels.length === 0) {
            document.getElementById('lots-container').innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 100px; color: #94a3b8;">No se han registrado parcelas en el sistema.</div>';
            return;
        }

        renderParcels(allParcels, globalEvents, globalSensors);

    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('lots-container').innerHTML = '<p class="error-msg">Error al conectar con el servidor.</p>';
    }
}

function renderParcels(parcels, events = [], sensors = []) {
    const container = document.getElementById('lots-container');
    if (!container) return;

    container.innerHTML = parcels.map((p, index) => {
        const parcelId = p.id || index;
        const parcelSensors = sensors.filter(s => 
            s.parcelas && s.parcelas.some(parcel => String(parcel.id) === String(p.id))
        );
        p.sensores = parcelSensors;

        const isHealthy = (p.estado && p.estado.toLowerCase().startsWith('activ')) && 
                         (p.currentHealth === null || p.currentHealth >= 50);
        
        return `
            <div class="lot-card" data-id="${parcelId}">
                <div class="lot-header">
                    <div class="lot-title">
                        <h2>${p.nombre}</h2>
                        <span>${p.tipoSuelo || 'CULTIVO'}</span>
                    </div>
                    <span class="badge-status ${isHealthy ? 'success' : 'danger'}">
                        ${isHealthy ? `SALUD: ${(p.currentHealth !== null && p.currentHealth !== undefined) ? p.currentHealth : 100}%` : 'ALERTA'}
                    </span>
                </div>
                <div class="lot-stats">
                    <div class="stat-item clickable" onclick="changeChart('${parcelId}', 'Humedad')">
                        <div class="stat-icon humidity">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg>
                        </div>
                        <span class="stat-label">Humedad</span>
                        <span class="stat-value">${(p.currentHumidity !== null) ? p.currentHumidity.toFixed(1) : '0.0'}%</span>
                    </div>
                    <div class="stat-item clickable" onclick="changeChart('${parcelId}', 'pH')">
                        <div class="stat-icon ph">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.5M14 2v7.5M8.5 22.5c-4.1 0-7.5-3.4-7.5-7.5 0-2.1 1-3.9 2.5-5.2l.5-.4V2h16v7.4l.5.4c1.5 1.3 2.5 3.1 2.5 5.2 0 4.1-3.4 7.5-7.5 7.5h-7Z"></path></svg>
                        </div>
                        <span class="stat-label">pH</span>
                        <span class="stat-value">${(p.currentPh !== null) ? p.currentPh.toFixed(1) : '0.0'}</span>
                    </div>
                    <div class="stat-item clickable" onclick="changeChart('${parcelId}', 'Temperatura')">
                        <div class="stat-icon temp">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>
                        </div>
                        <span class="stat-label">Temp</span>
                        <span class="stat-value">${(p.currentTemperature !== null && p.currentTemperature !== undefined) ? p.currentTemperature.toFixed(1) : '24.0'}°C</span>
                    </div>
                </div>
                <div class="lot-chart-container">
                    <div class="chart-header-mini" id="chart-header-${parcelId}">Graficando: Humedad</div>
                    <canvas id="chart-${parcelId}"></canvas>
                </div>
                <div class="lot-progress">
                    <div class="progress-bar ${isHealthy ? 'green' : 'orange'}" style="width: ${p.currentHealth || (isHealthy ? '85' : '40')}%"></div>
                </div>
                <div class="lot-actions">
                    <button class="btn-outline ${isHealthy ? '' : 'danger'} btn-details" onclick="viewDetails('${parcelId}')">
                        ${isHealthy ? 'Ver Detalles' : 'Atender Alerta'}
                    </button>
                    ${p.id && !String(p.id).startsWith('mock-') ? `
                    <button class="btn-delete" onclick="deleteParcela('${p.id}')" title="Eliminar Parcela">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Initialize Charts
    parcels.forEach((p, index) => {
        initChart(p, events, 'Humedad');
    });
}

let lastHumidityAverage = null;

async function loadStats() {
    try {
        const response = await authFetch('http://localhost:8080/api/parcelas/stats');
        if (!response) return;
        const stats = await response.json();

        // Update Health
        const healthText = stats.saludPromedio >= 80 ? 'Excelente' : stats.saludPromedio >= 50 ? 'Buena' : 'Crítica';
        document.getElementById('health-value').textContent = healthText;
        document.getElementById('health-bar').style.width = `${stats.saludPromedio}%`;

        // Update Humidity and Trend
        const currentHum = stats.humedadPromedio;
        document.getElementById('humidity-value').textContent = `${currentHum.toFixed(1)}%`;
        
        const trendEl = document.getElementById('humidity-trend');
        if (trendEl && lastHumidityAverage !== null) {
            const diff = currentHum - lastHumidityAverage;
            const diffPercent = ((diff / lastHumidityAverage) * 100).toFixed(1);
            
            if (diff > 0.1) {
                trendEl.innerHTML = `↗ +${diffPercent}% desde el último control`;
                trendEl.className = 'card-trend up';
            } else if (diff < -0.1) {
                trendEl.innerHTML = `↘ ${diffPercent}% desde el último control`;
                trendEl.className = 'card-trend down';
            } else {
                trendEl.innerHTML = `→ Estable desde el último control`;
                trendEl.className = 'card-trend';
                trendEl.style.color = '#94a3b8';
            }
        }
        lastHumidityAverage = currentHum;

        // Update PH
        document.getElementById('ph-value').textContent = stats.phPromedio.toFixed(1);

        // Update Alerts
        const alertsEl = document.getElementById('alerts-value');
        alertsEl.textContent = `${stats.alertasActivas} Advertencia${stats.alertasActivas !== 1 ? 's' : ''}`;
        
        if (stats.alertasActivas > 0) {
            alertsEl.classList.add('danger');
        } else {
            alertsEl.classList.remove('danger');
        }

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function initChart(parcel, events = [], sensorType = 'Humedad') {
    const canvasId = `chart-${parcel.id || allParcels.indexOf(parcel)}`;
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const sensorNames = (parcel.sensores || [])
        .filter(s => s.tipo.toLowerCase().includes(sensorType.toLowerCase()))
        .map(s => s.nombre);

    // Determine status for styling
    const isHealthy = (parcel.estado && parcel.estado.toLowerCase().startsWith('activ')) && 
                     (parcel.currentHealth === null || parcel.currentHealth >= 50);

    let dataPoints = events
        .filter(e => sensorNames.some(name => 
            e.origin && e.origin.trim().toLowerCase() === name.trim().toLowerCase()
        ))
        .map(e => {
            try {
                const p = typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload;
                const numericValue = parseFloat(p.value);
                const date = new Date(e.occurredOn);
                const timeStr = date.getHours().toString().padStart(2, '0') + ':' + 
                              date.getMinutes().toString().padStart(2, '0');
                return isNaN(numericValue) ? null : { value: numericValue, time: timeStr };
            } catch(ex) { return null; }
        })
        .filter(v => v !== null)
        .slice(-5);

    const isReal = dataPoints.length > 0;
    const header = document.getElementById(`chart-header-${parcel.id || allParcels.indexOf(parcel)}`);
    if (header) {
        header.textContent = `Graficando: ${sensorType}${isReal ? '' : ' (Esperando datos...)'}`;
        header.style.color = isReal ? 'var(--success)' : 'var(--text-muted)';
    }

    if (dataPoints.length === 0) {
        const now = new Date();
        dataPoints = (isHealthy 
            ? [42, 43, 42, 44, 43] 
            : [45, 42, 38, 35, 32]).map((v, i) => ({ 
                value: v + (sensorType === 'pH' ? -35 : 0) + (sensorType === 'Temperatura' ? -15 : 0), 
                time: (now.getHours()) + ":" + (now.getMinutes() - (5-i))
            }));
    }

    const chartColor = isHealthy ? '#10b981' : '#ef4444';
    const values = dataPoints.map(d => d.value);
    
    // Calculate stable Y range (minimum 20 units range to avoid "melting" effect on small variations)
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const center = (minVal + maxVal) / 2;
    const yMin = Math.min(minVal - 2, center - 10);
    const yMax = Math.max(maxVal + 2, center + 10);

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dataPoints.map(d => d.time),
            datasets: [{
                data: values,
                borderColor: chartColor,
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: chartColor,
                fill: false,
                tension: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 }, // Instant update to avoid "melting" animation
            plugins: { legend: { display: false } },
            scales: {
                x: { 
                    display: true, 
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                },
                y: { 
                    display: true, 
                    grid: { color: 'rgba(0,0,0,0.03)' },
                    ticks: { color: '#94a3b8', font: { size: 10 } },
                    min: yMin,
                    max: yMax
                }
            }
        }
    });
}

window.changeChart = (parcelId, type) => {
    const parcel = allParcels.find(p => String(p.id) === String(parcelId)) || 
                   allParcels[parseInt(parcelId)];
    
    if (!parcel) return;

    const header = document.getElementById(`chart-header-${parcelId}`);
    if (header) header.textContent = `Graficando: ${type}`;

    initChart(parcel, globalEvents, type);
};

// Modal Logic
const modal = document.getElementById('parcela-modal');
const fab = document.querySelector('.fab');
const closeModal = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const parcelaForm = document.getElementById('parcela-form');

fab.addEventListener('click', () => {
    modal.classList.remove('hidden');
    loadAvailableSensors();
});

async function loadAvailableSensors() {
    const container = document.getElementById('sensor-selection');
    if (!container) return;

    try {
        const response = await authFetch('http://localhost:8080/api/sensors');
        if (!response) return;
        const sensors = await response.json();

        if (sensors.length === 0) {
            container.innerHTML = '<p class="loading-sensors">No hay sensores disponibles.</p>';
            return;
        }

        container.innerHTML = sensors.map(s => `
            <div class="sensor-item">
                <input type="checkbox" id="s-${s.id}" name="sensorIds" value="${s.id}">
                <label for="s-${s.id}">
                    ${s.nombre}
                    <span class="sensor-type">${s.tipo}</span>
                </label>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading sensors:', error);
        container.innerHTML = '<p class="loading-sensors error">Error al cargar sensores.</p>';
    }
}

const hideModal = () => {
    modal.classList.add('hidden');
    parcelaForm.reset();
};

closeModal.addEventListener('click', hideModal);
cancelBtn.addEventListener('click', hideModal);

parcelaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(parcelaForm);
    const data = Object.fromEntries(formData.entries());
    
    data.areaTotal = parseFloat(data.areaTotal);
    data.latitud = data.latitud ? parseFloat(data.latitud) : null;
    data.longitud = data.longitud ? parseFloat(data.longitud) : null;
    data.unidadArea = "hectáreas"; 

    const selectedSensors = Array.from(parcelaForm.querySelectorAll('input[name="sensorIds"]:checked'))
        .map(cb => cb.value);
    data.sensorIds = selectedSensors;

    try {
        const response = await authFetch('http://localhost:8080/api/parcelas', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (response && response.ok) {
            hideModal();
            loadParcels();
        } else {
            alert('Error al guardar la parcela.');
        }
    } catch (error) {
        console.error('Error saving parcela:', error);
        alert('Error de conexión con el servidor.');
    }
});

// Logout Handler
btnLogout.addEventListener('click', async () => {
    await clearSession();
    localStorage.removeItem('magdalena_session');
    window.location.href = '/index.html';
});

// Alert Modal Logic
const alertModal = document.getElementById('alert-modal');
const closeAlertModal = document.getElementById('close-alert-modal');
const closeAlertBtn = document.getElementById('close-alert-btn');
const goToAnalysisBtn = document.getElementById('go-to-analysis-btn');

function viewDetails(id) {
    const parcel = allParcels.find(p => String(p.id) === String(id)) || 
                   allParcels[parseInt(id)];
    
    if (!parcel) return;

    const isHealthy = (parcel.estado && parcel.estado.toLowerCase().startsWith('activ')) && 
                     (parcel.currentHealth === null || parcel.currentHealth >= 80);

    if (isHealthy) {
        window.location.href = `/analysis.html?id=${id}`;
        return;
    }

    // Diagnostics for Alert Modal
    document.getElementById('alert-parcel-name').textContent = parcel.nombre;
    let reason = "";
    let action = "";

    const hum = parcel.currentHumidity || 0;
    const ph = parcel.currentPh || 0;

    if (hum < 40) {
        reason = `📉 <b>Humedad Crítica: ${hum.toFixed(1)}%</b>. El suelo está demasiado seco (Rango ideal: 40% - 80%).`;
        action = "Active el sistema de riego inmediatamente y verifique si hay obstrucciones en los aspersores.";
    } else if (hum > 80) {
        reason = `🌊 <b>Exceso de Humedad: ${hum.toFixed(1)}%</b>. Riesgo de encharcamiento e inundación de raíces (Rango ideal: 40% - 80%).`;
        action = "Verifique el drenaje de la parcela y detenga cualquier sistema de riego activo.";
    } else if (ph < 5.5) {
        reason = `🧪 <b>Suelo Ácido: pH ${ph.toFixed(1)}</b>. La acidez es demasiado alta para el cultivo (Rango ideal: 5.5 - 7.5).`;
        action = "Se recomienda la aplicación controlada de cal agrícola para equilibrar el pH.";
    } else if (ph > 7.5) {
        reason = `🧂 <b>Suelo Alcalino: pH ${ph.toFixed(1)}</b>. La alcalinidad está limitando la absorción de nutrientes (Rango ideal: 5.5 - 7.5).`;
        action = "Aplique fertilizantes acidificantes o materia orgánica para reducir el pH paulatinamente.";
    } else {
        reason = "⚠️ <b>Salud en descenso</b>. Se han detectado fluctuaciones inestables en los últimos sensores.";
        action = "Realice una inspección visual de los sensores y la salud de las hojas del cultivo.";
    }

    document.getElementById('alert-reason').innerHTML = reason;
    document.getElementById('alert-action').textContent = action;
    
    alertModal.classList.remove('hidden');
    
    goToAnalysisBtn.onclick = () => window.location.href = `/analysis.html?id=${id}`;
}

const hideAlertModal = () => alertModal.classList.add('hidden');
closeAlertModal.onclick = hideAlertModal;
closeAlertBtn.onclick = hideAlertModal;

async function deleteParcela(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta parcela?')) {
        return;
    }

    try {
        const response = await authFetch(`http://localhost:8080/api/parcelas/${id}`, {
            method: 'DELETE'
        });

        if (response && response.ok) {
            loadParcels();
            loadStats();
        } else {
            alert('Error al eliminar la parcela.');
        }
    } catch (error) {
        console.error('Error deleting parcela:', error);
    }
}

// ... rest of event listeners ...
// Profile Modal Handlers
btnOpenProfile.addEventListener('click', () => profileModal.classList.remove('hidden'));
const hideProfileModal = () => {
    profileModal.classList.add('hidden');
    profileForm.reset();
};
btnCloseProfile.addEventListener('click', hideProfileModal);
btnCancelProfile.addEventListener('click', hideProfileModal);

profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = document.getElementById('profile-password').value;
    const confirm = document.getElementById('profile-confirm-password').value;

    if (pass && pass !== confirm) {
        alert('Las contraseñas no coinciden.');
        return;
    }

    alert('✅ Perfil actualizado correctamente.');
    hideProfileModal();
});

// Password Visibility Toggle Logic
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;

        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        const icon = btn.querySelector('.eye-icon');
        if (type === 'text') {
            icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
            icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        }
    });
});

window.deleteParcela = deleteParcela;
window.viewDetails = viewDetails;
console.log('Magdalena Real-time Dashboard Initialized');
