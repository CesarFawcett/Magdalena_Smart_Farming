import { getSession, clearSession } from './utils/db';
import { authFetch } from './utils/api';

const btnLogout = document.getElementById('btn-logout');
const btnSimulate = document.getElementById('btn-simulate');
const btnClearSensors = document.getElementById('btn-clear-sensors');
const simIntervalSelect = document.getElementById('sim-interval');
const sensorsGrid = document.getElementById('sensors-grid');
const filterParcela = document.getElementById('filter-parcela');
const filterStatus = document.getElementById('filter-status');

// Modal Elements
const sensorModal = document.getElementById('sensor-modal');
const btnAddSensor = document.getElementById('btn-add-sensor');
const btnCloseModal = document.getElementById('close-sensor-modal');
const btnCancelModal = document.getElementById('cancel-sensor-btn');
const sensorForm = document.getElementById('sensor-form');
const selectParcelas = document.getElementById('sensor-parcelas');

// Profile Modal Elements
const profileModal = document.getElementById('profile-modal');
const btnOpenProfile = document.getElementById('btn-open-profile');
const btnCloseProfile = document.getElementById('close-profile-modal');
const btnCancelProfile = document.getElementById('cancel-profile-btn');
const profileForm = document.getElementById('profile-form');

let allSensors = [];
let allParcels = [];
let isSimulationActive = false;
let editingSensorId = null;

const modalTitle = document.getElementById('modal-title');
const groupsToHide = ['group-nombre', 'group-tipo-unidad', 'group-modo'].map(id => document.getElementById(id));
const groupParcelas = document.getElementById('group-parcelas');

// Check Session on Load
window.addEventListener('DOMContentLoaded', async () => {
    const session = await getSession();
    if (!session) {
        window.location.href = '/index.html';
        return;
    }
    
    if (session.name) {
        document.getElementById('user-display-name').textContent = session.name;
    }
    
    await loadParcels();
    await loadSensors();
    await checkSimulationStatus();
    startPollingSensors();
});

async function checkSimulationStatus() {
    try {
        const res = await authFetch('http://localhost:8080/api/sensors/simulate/status');
        if (res) {
            const data = await res.json();
            isSimulationActive = data.running;
            updateSimulateButton();
        }
    } catch (e) { console.error(e); }
}

function updateSimulateButton() {
    if (isSimulationActive) {
        btnSimulate.classList.add('active');
        btnSimulate.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            Detener Simulación
        `;
    } else {
        btnSimulate.classList.remove('active');
        btnSimulate.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Simular Datos
        `;
    }
}

async function loadParcels() {
    try {
        const response = await authFetch('http://localhost:8080/api/parcelas');
        if (!response) return;
        allParcels = await response.json();
        
        selectParcelas.innerHTML = allParcels.map(p => 
            `<option value="${p.id}">${p.nombre} (${p.tipoSuelo})</option>`
        ).join('');

        filterParcela.innerHTML = '<option value="all">Todos los Cultivos</option>' + 
            allParcels.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    } catch (error) {
        console.error('Error loading parcels:', error);
    }
}

async function loadSensors() {
    try {
        const response = await authFetch('http://localhost:8080/api/sensors');
        if (!response) return;
        allSensors = await response.json();
        applyFilters();
    } catch (error) {
        console.error('Error loading sensors:', error);
        sensorsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 100px; color: #ef4444;">Error crítico de conexión.</div>';
    }
}

function renderSensors(sensors) {
    if (sensors.length === 0) {
        sensorsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 100px;">No se detectan dispositivos.</div>';
        return;
    }

    sensorsGrid.innerHTML = sensors.map(s => {
        const isOff = s.modoOperacion === 'APAGADO';
        const isManual = s.modoOperacion === 'MANUAL';
        const statusClass = isOff ? 'offline' : 'online';
        
        const typeKey = s.tipo.toLowerCase();
        let iconType = 'gateway';
        if (typeKey.includes('humedad')) iconType = 'moisture';
        else if (typeKey.includes('ph')) iconType = 'ph';
        else if (typeKey.includes('temp')) iconType = 'temp';
        else if (typeKey.includes('clima')) iconType = 'weather';
        else if (typeKey.includes('viento')) iconType = 'wind';
        
        const parcelChips = s.parcelas && s.parcelas.length > 0 
            ? s.parcelas.map(p => `<span class="parcel-chip">${p.nombre}</span>`).join('') 
            : '<span class="parcel-chip none">Global Gateway</span>';

        const idNumeric = s.id ? s.id.split('-').reduce((acc, part) => acc + parseInt(part, 16), 0) : 0;
        const batteryLevel = 75 + (idNumeric % 25); 

        return `
            <div class="sensor-card ${isOff ? 'off' : ''}">
                <div class="sensor-header">
                    <div class="sensor-brand">
                        <div class="sensor-icon-box ${iconType}">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                ${iconType === 'moisture' ? '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path>' : ''}
                                ${iconType === 'ph' ? '<path d="M10 2v7.5"></path><path d="M14 2v7.5"></path><path d="M8.5 22.5c-4.1 0-7.5-3.4-7.5-7.5 0-2.1 1-3.9 2.5-5.2l.5-.4V2h16v7.4l.5.4c1.5 1.3 2.5 3.1 2.5 5.2 0 4.1-3.4 7.5-7.5 7.5h-7Z"></path>' : ''}
                                ${iconType === 'gateway' ? '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>' : ''}
                                ${iconType === 'temp' ? '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path>' : ''}
                                ${iconType === 'weather' ? '<path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path><circle cx="12" cy="12" r="4"></circle>' : ''}
                                ${iconType === 'wind' ? '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"></path><path d="M9.6 4.6A2 2 0 1 1 11 8H2"></path><path d="M12.6 19.4A2 2 0 1 0 14 16H2"></path>' : ''}
                            </svg>
                        </div>
                        <div class="sensor-name">
                            <h3>${s.nombre}</h3>
                            <p>${s.tipo} • Nodo Industrial</p>
                        </div>
                    </div>
                    <span class="status-indicator ${statusClass}">${isOff ? 'INACTIVO' : isManual ? 'MANUAL' : 'AUTOMÁTICO'}</span>
                </div>

                <div class="parcel-chips">
                    ${parcelChips}
                </div>

                <div class="mode-tabs">
                    <div class="mode-tab ${s.modoOperacion === 'ENCENDIDO' ? 'active' : ''}" onclick="updateSensorMode('${s.id}', 'ENCENDIDO')">Automático</div>
                    <div class="mode-tab ${s.modoOperacion === 'MANUAL' ? 'active' : ''}" onclick="updateSensorMode('${s.id}', 'MANUAL')">Manual</div>
                    <div class="mode-tab ${s.modoOperacion === 'APAGADO' ? 'active' : ''}" onclick="updateSensorMode('${s.id}', 'APAGADO')">Inactivo</div>
                </div>

                <div class="sensor-data-grid">
                    <div class="data-item">
                        <span class="data-label">Potencia Batería</span>
                        <span class="data-value">${batteryLevel}%</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">Transmisión</span>
                        <span class="data-value">${isOff ? '---' : 'LoRaWAN 915MHz'}</span>
                    </div>
                    <div class="data-item data-full">
                        <span class="data-label">Valor Recibido</span>
                        <span class="data-value" style="color: #10b981;">
                            ${isOff ? 'Sin señal' : (s.ultimoValor !== null && s.ultimoValor !== undefined ? s.ultimoValor.toFixed(1) + ' ' + (s.unidad || '') : 'Sin datos')}
                        </span>
                    </div>
                </div>

                ${isManual ? `
                    <div class="manual-input-box">
                        <input type="number" step="0.1" class="input-glow" id="val-${s.id}" placeholder="Entrada ${s.unidad || ''}">
                        <button class="btn-simulate" onclick="saveManualValue('${s.id}')">ENVIAR</button>
                    </div>
                ` : ''}

                <div class="card-actions-row">
                    <button class="btn-edit-small" onclick="openEditModal('${s.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        EDITAR ASIGNACIÓN
                    </button>
                    <button class="btn-delete" onclick="deleteSensor('${s.id}')">RETIRAR</button>
                </div>
            </div>
        `;
    }).join('');
}

async function updateSensorMode(id, mode) {
    try {
        const sensor = allSensors.find(s => s.id === id);
        const updated = { ...sensor, modoOperacion: mode, estado: mode === 'APAGADO' ? 'Inactivo' : 'Activo' };
        
        const response = await authFetch(`http://localhost:8080/api/sensors/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
        
        if (response && response.ok) loadSensors();
    } catch (error) {
        console.error('Error updating mode:', error);
    }
}

async function saveManualValue(id) {
    const input = document.getElementById(`val-${id}`);
    const val = input.value;
    if (!val) return;
    
    try {
        const sensor = allSensors.find(s => s.id === id);
        const response = await authFetch(`http://localhost:8080/api/sensors/${id}/reading`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: val + " " + (sensor.unidad || "") + " (Manual)" })
        });
        
        if (response && response.ok) {
            input.value = '';
            loadSensors();
        }
    } catch (error) {
        console.error('Error saving manual reading:', error);
    }
}

async function deleteSensor(id) {
    if (!confirm('¿Seguro que deseas retirar este dispositivo?')) return;
    try {
        const response = await authFetch(`http://localhost:8080/api/sensors/${id}`, { method: 'DELETE' });
        if (response && response.ok) loadSensors();
    } catch (error) {
        console.error('Error deleting sensor:', error);
    }
}

btnAddSensor.addEventListener('click', () => {
    editingSensorId = null;
    modalTitle.textContent = 'Configurar Nuevo Sensor';
    groupsToHide.forEach(g => g.style.display = 'block');
    // Ensure all inputs are required again
    sensorForm.querySelectorAll('input, select').forEach(i => {
        if (!i.name.includes('modo')) i.required = true;
    });
    sensorModal.classList.remove('hidden');
});

function openEditModal(id) {
    editingSensorId = id;
    const sensor = allSensors.find(s => s.id === id);
    if (!sensor) return;

    modalTitle.textContent = `Editar Asignación: ${sensor.nombre}`;
    
    // Hide non-relevant groups
    groupsToHide.forEach(g => g.style.display = 'none');
    
    // Disable required for hidden fields to allow submission
    groupsToHide.forEach(g => {
        g.querySelectorAll('input, select').forEach(i => i.required = false);
    });

    // Select current parcels
    const currentParcelIds = sensor.parcelas.map(p => p.id);
    Array.from(selectParcelas.options).forEach(opt => {
        opt.selected = currentParcelIds.includes(opt.value);
    });

    sensorModal.classList.remove('hidden');
}

const hideModal = () => {
    sensorModal.classList.add('hidden');
    sensorForm.reset();
    editingSensorId = null;
};
btnCloseModal.addEventListener('click', hideModal);
btnCancelModal.addEventListener('click', hideModal);

sensorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(sensorForm);
    const data = Object.fromEntries(formData.entries());
    const selectedOptions = Array.from(selectParcelas.selectedOptions);
    const parcelIds = selectedOptions.map(opt => opt.value);
    
    if (editingSensorId) {
        // UPDATE MODE
        const sensor = allSensors.find(s => s.id === editingSensorId);
        const updatedData = {
            ...sensor,
            parcelas: parcelIds.map(pid => ({ id: pid }))
        };

        try {
            const response = await authFetch(`http://localhost:8080/api/sensors/${editingSensorId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (response && response.ok) {
                hideModal();
                loadSensors();
            }
        } catch (error) {
            console.error('Error updating sensor:', error);
        }
    } else {
        // CREATE MODE
        const sensorData = {
            id: crypto.randomUUID(),
            nombre: data.nombre,
            tipo: data.tipo,
            unidad: data.unidad,
            modoOperacion: data.modoOperacion,
            estado: data.modoOperacion === 'APAGADO' ? 'Inactivo' : 'Activo',
            enLinea: data.modoOperacion !== 'APAGADO',
            fechaInstalacion: new Date().toISOString(),
            parcelas: parcelIds.map(pid => ({ id: pid }))
        };

        try {
            const response = await authFetch('http://localhost:8080/api/sensors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sensorData)
            });

            if (response && response.ok) {
                hideModal();
                loadSensors();
            }
        } catch (error) {
            console.error('Error saving sensor:', error);
        }
    }
});

async function toggleSimulation() {
    if (isSimulationActive) {
        try {
            await authFetch('http://localhost:8080/api/sensors/simulate/stop', { method: 'POST' });
            isSimulationActive = false;
        } catch (e) { console.error(e); }
    } else {
        const interval = simIntervalSelect.value;
        try {
            await authFetch(`http://localhost:8080/api/sensors/simulate?intervalSeconds=${interval}`, { method: 'POST' });
            isSimulationActive = true;
        } catch (e) { console.error(e); }
    }
    updateSimulateButton();
}

async function clearSensorsData() {
    if (!confirm('¿Estás seguro de que deseas limpiar los datos?')) return;
    try {
        const response = await authFetch('http://localhost:8080/api/sensors/clear', { method: 'POST' });
        if (response && response.ok) loadSensors();
    } catch (error) {
        console.error('Error clearing sensors:', error);
    }
}

function applyFilters() {
    let filtered = [...allSensors];
    const parcelId = filterParcela.value;
    const status = filterStatus.value;
    
    if (parcelId !== 'all') {
        filtered = filtered.filter(s => s.parcelas && s.parcelas.some(p => p.id === parcelId));
    }
    
    if (status !== 'all') {
        filtered = filtered.filter(s => s.estado === status);
    }
    
    renderSensors(filtered);
}

filterParcela.addEventListener('change', applyFilters);
filterStatus.addEventListener('change', applyFilters);

// Profile logic omitted for brevity, same as previous
btnSimulate.addEventListener('click', toggleSimulation);
btnClearSensors.addEventListener('click', clearSensorsData);
btnLogout.addEventListener('click', async () => {
    await clearSession();
    window.location.href = '/index.html';
});

window.deleteSensor = deleteSensor;
window.updateSensorMode = updateSensorMode;
window.saveManualValue = saveManualValue;
window.openEditModal = openEditModal;

function startPollingSensors() {
    setInterval(async () => {
        try {
            const response = await authFetch('http://localhost:8080/api/sensors');
            if (!response) return;
            allSensors = await response.json();
            applyFilters();
            
            const topBar = document.querySelector('.top-bar');
            if (topBar) {
                topBar.style.borderBottomColor = '#10b981';
                setTimeout(() => topBar.style.borderBottomColor = 'rgba(255,255,255,0.05)', 1000);
            }
        } catch (e) { console.error(e); }
    }, 5000);
}
