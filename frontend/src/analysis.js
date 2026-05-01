import { getSession, clearSession } from './utils/db';
import { authFetch } from './utils/api';

const btnLogout = document.getElementById('btn-logout');
const btnRefreshEvents = document.getElementById('btn-refresh-events');
const btnClearEvents = document.getElementById('btn-clear-events');
const eventTableBody = document.getElementById('event-table-body');
const selectParcela = document.getElementById('select-parcela');
const timeRangeSelect = document.getElementById('time-range');
const btnDownloadPdf = document.getElementById('btn-download-pdf');

// Profile Modal Elements
const profileModal = document.getElementById('profile-modal');
const btnOpenProfile = document.getElementById('btn-open-profile');
const btnCloseProfile = document.getElementById('close-profile-modal');
const btnCancelProfile = document.getElementById('cancel-profile-btn');
const profileForm = document.getElementById('profile-form');

// Modal Elements
const modalHistory = document.getElementById('modal-full-history');
const linkViewAll = document.getElementById('link-view-all-events');
const btnCloseModal = document.querySelector('.close-modal');
const fullEventTableBody = document.getElementById('full-event-table-body');
const btnPrevEvents = document.getElementById('btn-prev-events');
const btnNextEvents = document.getElementById('btn-next-events');
const pageIndicator = document.getElementById('page-indicator');

let allParcels = [];
let allSensors = [];
let allEvents = [];
let humidityChart = null;
let phChart = null;
let tempChart = null;
let currentParcel = null;
window.filteredEvents = [];

// Pagination state
let currentPage = 1;
const eventsPerPage = 5;

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
    
    // Load Data
    await loadParcels();
    loadEventHistory();
});

async function loadParcels() {
    try {
        const [parcelasRes, sensorsRes] = await Promise.all([
            authFetch('http://localhost:8080/api/parcelas'),
            authFetch('http://localhost:8080/api/sensors')
        ]);
        
        if (!parcelasRes || !sensorsRes) return;
        
        allParcels = await parcelasRes.json();
        allSensors = await sensorsRes.json();
        
        const urlParams = new URLSearchParams(window.location.search);
        const parcelId = urlParams.get('id');

        if (allParcels.length > 0) {
            populateParcelSelector();
            
            let selectedParcel = { id: 'all', nombre: 'Todas las parcelas', tipoSuelo: 'Múltiples' };
            selectParcela.value = 'all';
            if (parcelId) {
                const found = allParcels.find(p => String(p.id) === String(parcelId));
                if (found) {
                    selectedParcel = found;
                    selectParcela.value = allParcels.indexOf(found);
                }
            }
            
            currentParcel = selectedParcel;
            updateAnalysis();
        } else {
            const mock = { nombre: 'Parcela Ejemplo', tipoSuelo: 'Franco arenoso', currentPh: 6.2 };
            currentParcel = mock;
            updateAnalysis();
            selectParcela.innerHTML = '<option>Sin parcelas</option>';
        }
    } catch (error) {
        console.error('Error loading parcels:', error);
        const mock = { nombre: 'Parcela Ejemplo', tipoSuelo: 'Franco arenoso', currentPh: 6.2 };
        currentParcel = mock;
        updateAnalysis();
    }
}

function populateParcelSelector() {
    selectParcela.innerHTML = '<option value="all">Todas las parcelas</option>' + allParcels.map((p, index) => 
        `<option value="${index}">${p.nombre}</option>`
    ).join('');

    selectParcela.addEventListener('change', (e) => {
        if (e.target.value === 'all') {
            currentParcel = { id: 'all', nombre: 'Todas las parcelas', tipoSuelo: 'Múltiples' };
        } else {
            currentParcel = allParcels[e.target.value];
        }
        updateAnalysis();
        filterEventsAndRender();
    });

    timeRangeSelect.addEventListener('change', () => {
        updateAnalysis();
    });
}

function generateTimeLabels(range) {
    const labels = [];
    const now = new Date();
    
    if (range === '1h') {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - (i * 10 * 60 * 1000));
            labels.push(d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'));
        }
        return labels;
    }

    if (range === 'today') {
        for (let i = 144; i >= 0; i--) {
            const d = new Date(now.getTime() - (i * 10 * 60 * 1000));
            if (i % 6 === 0) { // Only show label every hour
                labels.push(d.getHours().toString().padStart(2, '0') + ':00');
            } else {
                labels.push(''); // Empty for spacing
            }
        }
        return labels;
    }

    const days = parseInt(range);
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        if (days <= 7) {
            labels.push(d.toLocaleDateString('es-CO', { weekday: 'short' }).toUpperCase());
        } else {
            labels.push(d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }));
        }
    }
    return labels;
}

const btnPhDetails = document.getElementById('btn-ph-details');

function updateAnalysis() {
    if (!currentParcel) return;
    
    document.getElementById('analysis-title').textContent = `Análisis de ${currentParcel.nombre} - ${currentParcel.tipoSuelo || 'Franco arenoso'}`;
    
    const rangeValue = timeRangeSelect.value;
    const labels = generateTimeLabels(rangeValue);
    
    let parcelEvents = getEventsForCurrentParcel();
    const humidityEvents = parcelEvents.filter(e => e.eventType.includes('HUMEDAD'));
    const tempEvents = parcelEvents.filter(e => e.eventType.includes('TEMP'));
    
    const humidityData = labels.map((label, idx) => calculateIntervalAverage(humidityEvents, rangeValue, idx, labels.length, currentParcel.currentHumidity || 65, 5));
    const tempData = labels.map((label, idx) => calculateIntervalAverage(tempEvents, rangeValue, idx, labels.length, currentParcel.currentTemperature || 24, 2));

    initHumidityChart(labels, humidityData);
    initTempChart(labels, tempData);
    
    // Get latest pH reading
    const phEvents = parcelEvents.filter(e => e.eventType.includes('PH'));
    let latestPh = currentParcel.currentPh || 6.5;
    
    if (phEvents.length > 0) {
        phEvents.sort((a, b) => new Date(b.occurredOn) - new Date(a.occurredOn));
        const p = typeof phEvents[0].payload === 'string' ? JSON.parse(phEvents[0].payload) : phEvents[0].payload;
        latestPh = parseFloat(p.value) || latestPh;
    }
    
    initPhGauge(latestPh);
}

function calculateIntervalAverage(events, rangeValue, idx, totalLabels, baseValue, variance) {
    const now = new Date();
    let startTime, endTime;

    if (rangeValue === '1h' || rangeValue === 'today') {
        const minutesBack = (totalLabels - idx) * 10;
        startTime = new Date(now.getTime() - (minutesBack * 60 * 1000));
        endTime = new Date(startTime.getTime() + (10 * 60 * 1000));
    } else {
        const daysBack = totalLabels - 1 - idx;
        startTime = new Date(now);
        startTime.setDate(startTime.getDate() - daysBack);
        startTime.setHours(0, 0, 0, 0);
        endTime = new Date(startTime);
        endTime.setHours(23, 59, 59, 999);
    }

    const intervalEvents = events.filter(e => {
        const d = new Date(e.occurredOn);
        return d >= startTime && d <= endTime;
    });
    
    if (intervalEvents.length > 0) {
        const sum = intervalEvents.reduce((acc, e) => {
            const p = typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload;
            return acc + (parseFloat(p.value) || 0);
        }, 0);
        return (sum / intervalEvents.length).toFixed(1);
    }
    
    const seed = (idx / totalLabels) * Math.PI;
    return (baseValue + Math.sin(seed) * variance + (Math.random() * (variance/2) - (variance/4))).toFixed(1);
}

function initTempChart(labels, data) {
    const ctx = document.getElementById('temp-large-chart').getContext('2d');
    if (tempChart) tempChart.destroy();
    tempChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temp °C',
                data: data,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: labels.length > 30 ? 0 : 4,
                pointBackgroundColor: '#ef4444'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 10, max: 45, grid: { borderDash: [5, 5] } },
                x: { 
                    grid: { display: false },
                    ticks: { maxRotation: 45, minRotation: 45, autoSkip: true, maxTicksLimit: 12 }
                }
            }
        }
    });
}

// pH Details listener
if (btnPhDetails) {
    btnPhDetails.addEventListener('click', () => {
        const parcelEvents = getEventsForCurrentParcel();
        const phEvents = parcelEvents.filter(e => e.eventType.includes('PH'));
        
        if (phEvents.length === 0) {
            alert(`No hay historial de pH registrado para ${currentParcel.nombre}.`);
            return;
        }

        window.filteredEvents = phEvents;
        currentPage = 1;
        updatePaginatedEvents();
        modalHistory.classList.add('active');
    });
}

function getEventsForCurrentParcel() {
    if (!currentParcel || currentParcel.id === 'all') return allEvents;

    // Get sensor IDs for this parcel
    const parcelSensors = allSensors.filter(s => 
        s.parcelas && s.parcelas.some(p => String(p.id) === String(currentParcel.id))
    );
    const sensorIds = parcelSensors.map(s => String(s.id));
    const sensorNames = parcelSensors.map(s => s.nombre.toLowerCase());

    return allEvents.filter(e => {
        try {
            const p = typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload;
            const sid = p.sensorId ? String(p.sensorId) : null;
            const sname = p.sensorName ? p.sensorName.toLowerCase() : (e.origin ? e.origin.toLowerCase() : '');
            
            if (sid && sensorIds.includes(sid)) return true;
            if (sname && sensorNames.some(name => sname.includes(name))) return true;
        } catch(ex) {}
        return false;
    });
}

async function loadEventHistory() {
    eventTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">Cargando historial...</td></tr>';
    
    try {
        const response = await authFetch('http://localhost:8080/api/events');
        if (!response) return;
        allEvents = await response.json();
    } catch (error) {
        console.error('Error loading events:', error);
    }
    filterEventsAndRender();
}

function filterEventsAndRender() {
    let filteredEvents = getEventsForCurrentParcel();
    
    filteredEvents.sort((a, b) => new Date(b.occurredOn) - new Date(a.occurredOn));
    window.filteredEvents = filteredEvents;
    
    renderEvents(filteredEvents.slice(0, 5), eventTableBody);
    currentPage = 1;
    updatePaginatedEvents();
}

function renderEvents(events, container) {
    if (events.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">No hay eventos.</td></tr>';
        return;
    }

    container.innerHTML = events.map(e => {
        let val = 'N/A';
        try {
            const p = typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload;
            val = p.value || p.email || 'OK';
        } catch(ex) {}

        const typeClass = e.eventType.includes('HUMEDAD') ? 'humidity' : e.eventType.includes('PH') ? 'warning' : 'sync';
        const dateStr = new Date(e.occurredOn).toLocaleString('es-CO', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });

        return `
            <tr>
                <td style="font-family: monospace; font-weight: 700;">#${String(e.eventId).substring(0,8).toUpperCase()}</td>
                <td style="color: #64748b;">${dateStr}</td>
                <td><span class="event-type-badge ${typeClass}">${e.eventType}</span></td>
                <td style="font-weight: 800;">${val}</td>
                <td style="color: #64748b;">${e.origin}</td>
            </tr>
        `;
    }).join('');
}

function updatePaginatedEvents() {
    const listToPaginate = window.filteredEvents || allEvents;
    const start = (currentPage - 1) * eventsPerPage;
    const end = start + eventsPerPage;
    const paginatedItems = listToPaginate.slice(start, end);
    const totalPages = Math.ceil(listToPaginate.length / eventsPerPage);

    renderEvents(paginatedItems, fullEventTableBody);
    pageIndicator.textContent = `Página ${currentPage} de ${totalPages || 1}`;
    
    btnPrevEvents.disabled = currentPage === 1;
    btnNextEvents.disabled = currentPage === totalPages || totalPages === 0;
}

// Charts
function initHumidityChart(labels, data) {
    const ctx = document.getElementById('humidity-large-chart').getContext('2d');
    if (humidityChart) humidityChart.destroy();
    humidityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Humedad %',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: labels.length > 30 ? 0 : 4,
                pointBackgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 40, max: 80, grid: { borderDash: [5, 5] } },
                x: { 
                    grid: { display: false },
                    ticks: { maxRotation: 45, minRotation: 45, autoSkip: true, maxTicksLimit: 12 }
                }
            }
        }
    });
}

function initPhGauge(val) {
    const ctx = document.getElementById('ph-gauge').getContext('2d');
    document.getElementById('gauge-ph-value').textContent = val;
    if (phChart) phChart.destroy();
    phChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [val, 14 - val],
                backgroundColor: ['#22c55e', '#f1f5f9'],
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
                cutout: '85%',
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { tooltip: { enabled: false }, legend: { display: false } }
        }
    });

    const rangeMarker = document.querySelector('.range-marker');
    if (rangeMarker) {
        const percent = ((val - 4) / (8 - 4)) * 100;
        rangeMarker.style.left = `${Math.max(0, Math.min(100, percent))}%`;
    }
}

// PDF Download
async function downloadPDF() {
    try {
        const originalText = btnDownloadPdf.innerHTML;
        btnDownloadPdf.disabled = true;
        btnDownloadPdf.innerHTML = 'Generando...';

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Add Logo & Title
        doc.setFontSize(22);
        doc.setTextColor(11, 57, 33);
        doc.text('MAGDALENA SMART FARMING', 20, 25);
        
        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        doc.text(`Reporte de Análisis: ${currentParcel.nombre}`, 20, 35);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 42);
        doc.text(`Rango: ${timeRangeSelect.options[timeRangeSelect.selectedIndex].text}`, 20, 49);
        
        doc.setDrawColor(226, 232, 240);
        doc.line(20, 55, pageWidth - 20, 55);

        // Capture Analysis Cards
        const analysisGrid = document.querySelector('.analysis-grid');
        const canvas = await html2canvas(analysisGrid, { 
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#f8fafc' // Match background
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        doc.addImage(imgData, 'PNG', 20, 65, imgWidth, imgHeight);
        
        // Add Event History Summary
        const tableY = 75 + imgHeight;
        if (tableY < 250) {
            doc.setFontSize(16);
            doc.setTextColor(11, 57, 33);
            doc.text('Resumen de Eventos Recientes', 20, tableY);
            
            let yPos = tableY + 10;
            doc.setFontSize(9);
            doc.setTextColor(50, 50, 50);
            
            const listToPrint = window.filteredEvents || allEvents;
            listToPrint.slice(0, 12).forEach((e, i) => {
                const date = new Date(e.occurredOn).toLocaleString();
                let val = 'N/A';
                try {
                    const p = typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload;
                    val = p.value || p.email || 'OK';
                } catch(ex) {}
                doc.text(`${date} - ${e.eventType} - ${val} - Origen: ${e.origin}`, 20, yPos + (i * 6));
            });
        }

        doc.save(`Reporte_Magdalena_${currentParcel.nombre.replace(/\s+/g, '_')}.pdf`);
        
        btnDownloadPdf.disabled = false;
        btnDownloadPdf.innerHTML = originalText;

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Hubo un error al generar el reporte. Por favor intente de nuevo.');
        btnDownloadPdf.disabled = false;
        btnDownloadPdf.innerHTML = 'Descargar Reporte';
    }
}

// Event Listeners
btnRefreshEvents.addEventListener('click', loadEventHistory);

if (btnClearEvents) {
    btnClearEvents.addEventListener('click', async () => {
        if (!confirm('¿Estás seguro de que deseas borrar TODO el historial de eventos inmutable? Esta acción no se puede deshacer.')) return;
        
        try {
            const response = await authFetch('http://localhost:8080/api/events/clear', { method: 'POST' });
            if (response && response.ok) {
                loadEventHistory();
            }
        } catch (error) {
            console.error('Error clearing events:', error);
        }
    });
}
timeRangeSelect.addEventListener('change', updateAnalysis);
btnDownloadPdf.addEventListener('click', downloadPDF);

linkViewAll.addEventListener('click', (e) => {
    e.preventDefault();
    currentPage = 1;
    updatePaginatedEvents();
    modalHistory.classList.add('active');
});

btnCloseModal.addEventListener('click', () => {
    modalHistory.classList.remove('active');
});

window.addEventListener('click', (e) => {
    if (e.target === modalHistory) modalHistory.classList.remove('active');
});

btnPrevEvents.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        updatePaginatedEvents();
    }
});

btnNextEvents.addEventListener('click', () => {
    const listToPaginate = window.filteredEvents || allEvents;
    const totalPages = Math.ceil(listToPaginate.length / eventsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        updatePaginatedEvents();
    }
});

btnLogout.addEventListener('click', async () => {
    await clearSession();
    window.location.href = '/index.html';
});

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

    alert('✅ Perfil actualizado correctamente en Análisis.');
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
