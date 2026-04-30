import { getSession, clearSession } from './utils/db';

const btnLogout = document.getElementById('btn-logout');
const logsTableBody = document.getElementById('logs-table-body');

// Mock Logs
const logs = [
    {
        timestamp: '2026-04-29 14:22:01',
        id: '#TRX-9921',
        origin: 'Node-Edge-04',
        status: 'SUCCESS',
        details: 'Data packet synchronized via MQTT.'
    },
    {
        timestamp: '2026-04-29 14:21:58',
        id: '#TRX-9920',
        origin: 'Node-Edge-02',
        status: 'SUCCESS',
        details: 'Heartbeat signal received and logged.'
    },
    {
        timestamp: '2026-04-29 14:20:12',
        id: '#TRX-9918',
        origin: 'Node-Edge-04',
        status: 'RETRYING',
        details: 'Handshake timeout. Automatic retry #2.'
    },
    {
        timestamp: '2026-04-29 14:18:45',
        id: '#TRX-9915',
        origin: 'Node-Edge-01',
        status: 'ERROR',
        details: 'Payload integrity mismatch (SHA-256).'
    },
    {
        timestamp: '2026-04-29 14:15:30',
        id: '#TRX-9912',
        origin: 'Node-Edge-03',
        status: 'SUCCESS',
        details: 'Full batch synchronization complete.'
    }
];

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
    
    renderLogs(logs);
});

function renderLogs(data) {
    logsTableBody.innerHTML = data.map(l => `
        <tr>
            <td style="color: #64748b;">${l.timestamp}</td>
            <td class="event-id">${l.id}</td>
            <td>${l.origin}</td>
            <td><span class="status-badge ${l.status.toLowerCase()}">${l.status}</span></td>
            <td style="color: #475569;">${l.details}</td>
        </tr>
    `).join('');
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
