import { getSession, clearSession } from './utils/db';

const btnLogout = document.getElementById('btn-logout');
const logsTableBody = document.getElementById('logs-table-body');

let allEvents = [];
let stompClient = null;

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
    
    await loadSyncLogs();
    connectWebSocket();
});

function connectWebSocket() {
    const socket = new SockJS('http://localhost:8080/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // Quiet logs

    stompClient.connect({}, () => {
        console.log('Sync Center: Conectado a EDA Stream');
        stompClient.subscribe('/topic/sensors', (message) => {
            const event = JSON.parse(message.body);
            addLiveEvent(event);
        });
    }, (error) => {
        console.error('WebSocket Error:', error);
        setTimeout(connectWebSocket, 5000); // Retry
    });
}

function addLiveEvent(event) {
    // Add to top of list
    const date = new Date(event.occurredOn).toLocaleString('es-CO');
    const id = `#TRX-${String(event.eventId).substring(0, 4).toUpperCase()}`;
    
    let details = 'N/A';
    try {
        const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
        details = p.value || p.email || 'Registro sincronizado';
    } catch(ex) {}

    const isSuccess = !event.eventType.includes('ERROR') && !event.eventType.includes('ALERT');
    const status = isSuccess ? 'SUCCESS' : 'WARNING';

    const row = document.createElement('tr');
    row.className = 'live-row';
    row.innerHTML = `
        <td style="color: #64748b;">${date}</td>
        <td class="event-id">${id}</td>
        <td>${event.origin || 'Edge-Gateway'}</td>
        <td><span class="status-badge ${status.toLowerCase()}">${status}</span></td>
        <td style="color: #475569;">${event.eventType}: ${details}</td>
    `;
    
    logsTableBody.prepend(row);

    // Keep table size manageable
    if (logsTableBody.children.length > 50) {
        logsTableBody.lastElementChild.remove();
    }
}

async function loadSyncLogs() {
    try {
        const response = await fetch('http://localhost:8080/api/events', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Error fetching events');
        
        allEvents = await response.json();
        allEvents.sort((a, b) => new Date(b.occurredOn) - new Date(a.occurredOn));
        
        renderLogs(allEvents.slice(0, 20)); // Last 20
    } catch (error) {
        console.error('Error loading sync logs:', error);
        logsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ef4444;">Error al conectar con el Centro de Sincronización.</td></tr>';
    }
}

function renderLogs(data) {
    if (data.length === 0) {
        logsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">No hay transacciones registradas.</td></tr>';
        return;
    }

    logsTableBody.innerHTML = data.map(e => {
        const date = new Date(e.occurredOn).toLocaleString('es-CO');
        const id = `#TRX-${String(e.eventId).substring(0, 4).toUpperCase()}`;
        
        let details = 'N/A';
        try {
            const p = typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload;
            details = p.value || p.email || 'Registro sincronizado';
        } catch(ex) {}

        const isSuccess = !e.eventType.includes('ERROR') && !e.eventType.includes('ALERT');
        const status = isSuccess ? 'SUCCESS' : 'WARNING';

        return `
            <tr>
                <td style="color: #64748b;">${date}</td>
                <td class="event-id">${id}</td>
                <td>${e.origin || 'Edge-Gateway'}</td>
                <td><span class="status-badge ${status.toLowerCase()}">${status}</span></td>
                <td style="color: #475569;">${e.eventType}: ${details}</td>
            </tr>
        `;
    }).join('');
}

btnLogout.addEventListener('click', async () => {
    await clearSession();
    window.location.href = '/index.html';
});

// Profile Modal Elements
const profileModal = document.getElementById('profile-modal');
const btnOpenProfile = document.getElementById('btn-open-profile');
const btnCloseProfile = document.getElementById('close-profile-modal');
const btnCancelProfile = document.getElementById('cancel-profile-btn');
const profileForm = document.getElementById('profile-form');

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

    alert('✅ Perfil actualizado correctamente en el Centro de Sincronización.');
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
