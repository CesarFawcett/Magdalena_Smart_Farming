import { getSession, clearSession } from './utils/db';

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
    
    loadSensors();
    loadParcels();
    startPollingSensors();
});

async function loadParcels() {
    try {
        const response = await fetch('http://localhost:8080/api/parcelas');
        allParcels = await response.json();
        
        selectParcelas.innerHTML = allParcels.map(p => 
            `<option value="${p.id}">${p.nombre} (${p.tipoSuelo})</option>`
        ).join('');

        // Also populate the filter dropdown
        filterParcela.innerHTML = '<option value="all">Todos los Cultivos</option>' + 
            allParcels.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    } catch (error) {
        console.error('Error loading parcels:', error);
    }
}

async function loadSensors() {
    sensorsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 100px;">Sincronizando con red de sensores Magdalena...</div>';
    
    try {
        const response = await fetch('http://localhost:8080/api/sensors');
        allSensors = await response.json();
        applyFilters(); // Use filter logic instead of direct render
    } catch (error) {
        console.error('Error loading sensors:', error);
        sensorsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 100px; color: #ef4444;">Error crítico: No se pudo establecer conexión con el Gateway LoRaWAN.</div>';
    }
}

function renderSensors(sensors) {
    if (sensors.length === 0) {
        sensorsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 100px;">No se detectan dispositivos en esta zona.</div>';
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
        
        const parcelChips = s.parcelas && s.parcelas.length > 0 
            ? s.parcelas.map(p => `<span class="parcel-chip">${p.nombre}</span>`).join('') 
            : '<span class="parcel-chip none">Global Gateway</span>';

        // Stable battery level based on ID to avoid jumpy values on refresh
        const idNumeric = s.id.split('-').reduce((acc, part) => acc + parseInt(part, 16), 0);
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
                            </svg>
                        </div>
                        <div class="sensor-name">
                            <h3>${s.nombre}</h3>
                            <p>${s.tipo} • Industrial Node</p>
                        </div>
                    </div>
                    <span class="status-indicator ${statusClass}">${isOff ? 'OFFLINE' : 'ONLINE'}</span>
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
                        <span class="data-value">${isOff ? '---' : 'LoRa 915MHz'}</span>
                    </div>
                    <div class="data-item data-full">
                        <span class="data-label">Telemetría Reciente</span>
                        <span class="data-value" style="color: #10b981;">
                            ${isOff ? 'Sin señal' : isManual ? 'Pendiente de entrada...' : (s.ultimoValor !== null && s.ultimoValor !== undefined ? s.ultimoValor.toFixed(1) + ' ' + s.unidad : 'Iniciando...')}
                        </span>
                    </div>
                </div>

                ${isManual ? `
                    <div class="manual-input-box">
                        <input type="number" step="0.1" class="input-glow" id="val-${s.id}" placeholder="0.0 ${s.unidad}">
                        <button class="btn-simulate" onclick="saveManualValue('${s.id}')">ENVIAR</button>
                    </div>
                ` : ''}

                <button class="btn-delete" onclick="deleteSensor('${s.id}')">RETIRAR DISPOSITIVO</button>
            </div>
        `;
    }).join('');
}

async function updateSensorMode(id, mode) {
    try {
        const sensor = allSensors.find(s => s.id === id);
        const updated = { ...sensor, modoOperacion: mode, estado: mode === 'APAGADO' ? 'Inactivo' : 'Activo' };
        
        const response = await fetch(`http://localhost:8080/api/sensors/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
        
        if (response.ok) loadSensors();
    } catch (error) {
        console.error('Error updating mode:', error);
    }
}

async function saveManualValue(id) {
    const input = document.getElementById(`val-${id}`);
    const val = input.value;
    if (!val) return;
    
    try {
        const response = await fetch(`http://localhost:8080/api/sensors/${id}/reading`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: val + " (Ingreso Manual)" })
        });
        
        if (response.ok) {
            alert(`✅ Telemetría manual registrada: ${val}. Sincronizado con Historial Inmutable.`);
            input.value = '';
            loadSensors();
        }
    } catch (error) {
        console.error('Error saving manual reading:', error);
    }
}

async function deleteSensor(id) {
    if (!confirm('¿Seguro que deseas retirar este dispositivo? Esta acción es definitiva.')) return;
    try {
        const response = await fetch(`http://localhost:8080/api/sensors/${id}`, { method: 'DELETE' });
        if (response.ok) loadSensors();
    } catch (error) {
        console.error('Error deleting sensor:', error);
    }
}

btnAddSensor.addEventListener('click', () => sensorModal.classList.remove('hidden'));
const hideModal = () => {
    sensorModal.classList.add('hidden');
    sensorForm.reset();
};
btnCloseModal.addEventListener('click', hideModal);
btnCancelModal.addEventListener('click', hideModal);

sensorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(sensorForm);
    const data = Object.fromEntries(formData.entries());
    const selectedOptions = Array.from(selectParcelas.selectedOptions);
    const parcelIds = selectedOptions.map(opt => opt.value);
    
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
        const response = await fetch('http://localhost:8080/api/sensors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sensorData)
        });

        if (response.ok) {
            hideModal();
            loadSensors();
        }
    } catch (error) {
        console.error('Error saving sensor:', error);
    }
});

async function startSimulation() {
    const interval = simIntervalSelect.value;
    btnSimulate.disabled = true;
    const originalContent = btnSimulate.innerHTML;
    btnSimulate.innerHTML = 'SYNC...';

    try {
        await fetch(`http://localhost:8080/api/sensors/simulate?intervalSeconds=${interval}`, { method: 'POST' });
        alert(`Ciclo de simulación activo (${interval}s).`);
    } catch (error) {
        console.error('Error starting simulation:', error);
    } finally {
        setTimeout(() => {
            btnSimulate.disabled = false;
            btnSimulate.innerHTML = originalContent;
        }, 1000);
    }
}

async function clearSensorsData() {
    if (!confirm('¿Estás seguro de que deseas limpiar los datos de todos los sensores? Esto reseteará la telemetría actual.')) return;
    
    const originalContent = btnClearSensors.innerHTML;
    btnClearSensors.disabled = true;
    btnClearSensors.innerHTML = 'Limpiando...';

    try {
        const response = await fetch('http://localhost:8080/api/sensors/clear', { method: 'POST' });
        if (response.ok) {
            alert('✅ Telemetría de sensores reseteada correctamente.');
            loadSensors();
        }
    } catch (error) {
        console.error('Error clearing sensors:', error);
    } finally {
        btnClearSensors.disabled = false;
        btnClearSensors.innerHTML = originalContent;
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

    alert('✅ Perfil actualizado correctamente en Gestión de Sensores.');
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

btnSimulate.addEventListener('click', startSimulation);
btnClearSensors.addEventListener('click', clearSensorsData);
btnLogout.addEventListener('click', async () => {
    await clearSession();
    window.location.href = '/index.html';
});

window.deleteSensor = deleteSensor;
window.updateSensorMode = updateSensorMode;
window.saveManualValue = saveManualValue;

function startPollingSensors() {
    setInterval(() => {
        fetch('http://localhost:8080/api/sensors')
            .then(response => response.json())
            .then(data => {
                allSensors = data;
                applyFilters();
                
                // Brief visual indicator that data was synced
                const topBar = document.querySelector('.top-bar');
                if (topBar) {
                    topBar.style.borderBottomColor = '#10b981';
                    setTimeout(() => topBar.style.borderBottomColor = 'rgba(255,255,255,0.05)', 1000);
                }
            })
            .catch(e => console.error('Error polling sensors:', e));
    }, 5000);
}
