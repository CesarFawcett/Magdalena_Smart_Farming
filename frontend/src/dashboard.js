import { getSession, clearSession } from './utils/db';

const btnLogout = document.getElementById('btn-logout');
const btnShowAlerts = document.getElementById('btn-show-alerts');
const searchInput = document.getElementById('search-input');

let allParcels = [];

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
    
    // Simulate some real-time updates
    simulateSensorData();

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

// Search and Filter Listeners
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allParcels.filter(p => 
        p.nombre.toLowerCase().includes(term) || 
        (p.tipoSuelo && p.tipoSuelo.toLowerCase().includes(term))
    );
    renderParcels(filtered);
});

btnShowAlerts.addEventListener('click', (e) => {
    e.preventDefault();
    const filtered = allParcels.filter(p => 
        p.estado !== 'Activa' || (p.currentHealth !== null && p.currentHealth < 50)
    );
    
    if (filtered.length === 0) {
        alert('No hay parcelas con alertas en este momento.');
    } else {
        renderParcels(filtered);
    }
});

async function loadParcels() {
    try {
        const response = await fetch('http://localhost:8080/api/parcelas');
        allParcels = await response.json();

        if (allParcels.length === 0) {
            document.getElementById('lots-container').innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 100px; color: #94a3b8;">No se han registrado parcelas en el sistema.</div>';
            return;
        }

        renderParcels(allParcels);

    } catch (error) {
        console.error('Error loading parcels:', error);
        document.getElementById('lots-container').innerHTML = '<p class="error-msg">Error al conectar con el servidor de parcelas.</p>';
    }
}
function renderParcels(parcels) {
    const container = document.getElementById('lots-container');
    if (!container) return;

    container.innerHTML = parcels.map((p, index) => {
        const isHealthy = (p.estado && p.estado.toLowerCase().startsWith('activ')) && 
                         (p.currentHealth === null || p.currentHealth >= 50);
        
        return `
            <div class="lot-card">
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
                    <div class="stat-item">
                        <div class="stat-icon humidity">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg>
                        </div>
                        <span class="stat-label">Humedad</span>
                        <span class="stat-value">${(p.currentHumidity !== null && p.currentHumidity !== undefined) ? p.currentHumidity.toFixed(1) : '0.0'}%</span>
                    </div>
                    <div class="stat-item">
                        <div class="stat-icon ph">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.5"></path><path d="M14 2v7.5"></path><path d="M8.5 22.5c-4.1 0-7.5-3.4-7.5-7.5 0-2.1 1-3.9 2.5-5.2l.5-.4V2h16v7.4l.5.4c1.5 1.3 2.5 3.1 2.5 5.2 0 4.1-3.4 7.5-7.5 7.5h-7Z"></path></svg>
                        </div>
                        <span class="stat-label">Nivel pH</span>
                        <span class="stat-value">${(p.currentPh !== null && p.currentPh !== undefined) ? p.currentPh.toFixed(1) : '0.0'}</span>
                    </div>
                </div>
                <div class="lot-chart-container">
                    <canvas id="chart-${p.id || index}"></canvas>
                </div>
                <div class="lot-progress">
                    <div class="progress-bar ${isHealthy ? 'green' : 'orange'}" style="width: ${p.currentHealth || (isHealthy ? '85' : '40')}%"></div>
                </div>
                <div class="lot-actions">
                    <button class="btn-outline ${isHealthy ? '' : 'danger'} btn-details" data-id="${p.id || index}">
                        ${isHealthy ? 'Ver Detalles' : 'Atender Alerta'}
                    </button>
                    ${p.id && !String(p.id).startsWith('mock-') ? `
                    <button class="btn-delete" data-id="${p.id}" title="Eliminar Parcela">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Initialize Charts
    parcels.forEach((p, index) => {
        const isHealthy = (p.estado && p.estado.toLowerCase().startsWith('activ')) && 
                         (p.currentHealth === null || p.currentHealth >= 50);
        initChart(`chart-${p.id || index}`, isHealthy);
    });
}

async function loadStats() {
    try {
        const response = await fetch('http://localhost:8080/api/parcelas/stats');
        const stats = await response.json();

        // Update Health
        const healthText = stats.saludPromedio >= 80 ? 'Excelente' : stats.saludPromedio >= 50 ? 'Buena' : 'Crítica';
        document.getElementById('health-value').textContent = healthText;
        document.getElementById('health-bar').style.width = `${stats.saludPromedio}%`;

        // Update Humidity
        document.getElementById('humidity-value').textContent = `${stats.humedadPromedio.toFixed(1)}%`;

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

function initChart(canvasId, isHealthy) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Mock data for the trend
    const data = isHealthy 
        ? [40, 42, 41, 43, 42, 44, 42] 
        : [45, 42, 38, 35, 32, 30, 28];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
            datasets: [{
                label: 'Humedad %',
                data: data,
                borderColor: isHealthy ? '#10B981' : '#EF4444',
                backgroundColor: isHealthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false, min: 20, max: 50 }
            }
        }
    });
}

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
        const response = await fetch('http://localhost:8080/api/sensors');
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
    
    // Convert numeric strings to numbers
    data.areaTotal = parseFloat(data.areaTotal);
    data.latitud = data.latitud ? parseFloat(data.latitud) : null;
    data.longitud = data.longitud ? parseFloat(data.longitud) : null;
    data.unidadArea = "hectáreas"; // Default

    // Get selected sensors
    const selectedSensors = Array.from(parcelaForm.querySelectorAll('input[name="sensorIds"]:checked'))
        .map(cb => cb.value);
    data.sensorIds = selectedSensors;

    try {
        const response = await fetch('http://localhost:8080/api/parcelas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            hideModal();
            loadParcels(); // Refresh list
        } else {
            alert('Error al guardar la parcela. Por favor intente de nuevo.');
        }
    } catch (error) {
        console.error('Error saving parcela:', error);
        alert('Error de conexión con el servidor.');
    }
});

// Logout Handler
btnLogout.addEventListener('click', async () => {
    await clearSession();
    window.location.href = '/index.html';
});

function viewDetails(id) {
    window.location.href = `/analysis.html?id=${id}`;
}

async function deleteParcela(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta parcela? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:8080/api/parcelas/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadParcels();
            loadStats();
        } else {
            alert('Error al eliminar la parcela.');
        }
    } catch (error) {
        console.error('Error deleting parcela:', error);
        alert('Error de conexión con el servidor.');
    }
}

function simulateSensorData() {
    // Polling logic to fetch real data from backend every 5 seconds
    setInterval(() => {
        loadParcels();
        loadStats();
        
        // Brief visual indicator that data was synced
        const topBar = document.querySelector('.top-bar');
        if (topBar) {
            topBar.style.borderBottomColor = '#10b981';
            setTimeout(() => topBar.style.borderBottomColor = 'rgba(255,255,255,0.05)', 1000);
        }
    }, 5000);
}
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
    const email = document.getElementById('profile-email').value;
    const pass = document.getElementById('profile-password').value;
    const confirm = document.getElementById('profile-confirm-password').value;

    if (pass && pass !== confirm) {
        alert('Las contraseñas no coinciden.');
        return;
    }

    alert('✅ Perfil actualizado correctamente en el Tablero.');
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
        
        // Toggle Icon
        const icon = btn.querySelector('.eye-icon');
        if (type === 'text') {
            icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
            icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        }
    });
});

// Expose to window for onclick
window.deleteParcela = deleteParcela;
window.viewDetails = viewDetails;

// Mobile responsiveness toggle (if added later)
console.log('Magdalena Dashboard Initialized');
