import { getSession, clearSession } from './utils/db';

const btnLogout = document.getElementById('btn-logout');

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
    
    // Simulate some real-time updates
    simulateSensorData();
});

// Logout Handler
btnLogout.addEventListener('click', async () => {
    await clearSession();
    window.location.href = '/index.html';
});

function simulateSensorData() {
    // This could be replaced with real WebSocket/Polling logic
    setInterval(() => {
        const humidityElements = document.querySelectorAll('.stat-value');
        // Just a visual pulse effect to simulate "live" data
        humidityElements.forEach(el => {
            el.style.opacity = '0.7';
            setTimeout(() => el.style.opacity = '1', 500);
        });
    }, 5000);
}

// Mobile responsiveness toggle (if added later)
console.log('Magdalena Dashboard Initialized');
