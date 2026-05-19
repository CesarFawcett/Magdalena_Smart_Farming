export const mockData = {
    login: {
        email: "test@magdalena.ag",
        name: "Usuario APK (Mock)",
        token: "mock-jwt-token"
    },
    parcelas: [
        {
            id: "mock-1",
            nombre: "Parcela Alpha",
            tipoSuelo: "Franco Arcilloso",
            areaTotal: 50,
            unidadArea: "hectáreas",
            latitud: 11.24,
            longitud: -74.19,
            estado: "Activa",
            currentHumidity: 65,
            currentTemperature: 28,
            currentPh: 6.8,
            currentHealth: 95
        },
        {
            id: "mock-2",
            nombre: "Parcela Beta",
            tipoSuelo: "Arenoso",
            areaTotal: 30,
            unidadArea: "hectáreas",
            latitud: 11.25,
            longitud: -74.20,
            estado: "Activa",
            currentHumidity: 35,
            currentTemperature: 32,
            currentPh: 5.2,
            currentHealth: 45
        }
    ],
    events: [
        {
            id: 1,
            eventType: "SENSOR_READING",
            origin: "Sensor Humedad Alpha",
            payload: JSON.stringify({ value: 64 }),
            occurredOn: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 2,
            eventType: "SENSOR_READING",
            origin: "Sensor Humedad Alpha",
            payload: JSON.stringify({ value: 65 }),
            occurredOn: new Date(Date.now() - 1800000).toISOString()
        },
        {
            id: 3,
            eventType: "SENSOR_READING",
            origin: "Sensor Humedad Beta",
            payload: JSON.stringify({ value: 38 }),
            occurredOn: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 4,
            eventType: "SENSOR_READING",
            origin: "Sensor Humedad Beta",
            payload: JSON.stringify({ value: 35 }),
            occurredOn: new Date(Date.now() - 1800000).toISOString()
        }
    ],
    sensors: [
        {
            id: "s-1",
            nombre: "Sensor Humedad Alpha",
            tipo: "Humedad",
            unidad: "%",
            modoOperacion: "ENCENDIDO",
            estado: "Activo",
            ultimoValor: 65.0,
            parcelas: [{ id: "mock-1" }]
        },
        {
            id: "s-2",
            nombre: "Sensor Humedad Beta",
            tipo: "Humedad",
            unidad: "%",
            modoOperacion: "ENCENDIDO",
            estado: "Activo",
            ultimoValor: 35.0,
            parcelas: [{ id: "mock-2" }]
        },
        {
            id: "s-3",
            nombre: "Sensor pH Alpha",
            tipo: "pH",
            unidad: "",
            modoOperacion: "ENCENDIDO",
            estado: "Activo",
            ultimoValor: 6.8,
            parcelas: [{ id: "mock-1" }]
        }
    ],
    stats: {
        totalParcelas: 2,
        areaTotal: 80,
        humedadPromedio: 50,
        temperaturaPromedio: 30,
        phPromedio: 6.0,
        saludPromedio: 70,
        alertasActivas: 1
    }
};

let mockSimulationRunning = false;
let mockSimulationInterval = null;

function startMockSimulation() {
    if (mockSimulationInterval) return;
    mockSimulationInterval = setInterval(() => {
        if (!mockSimulationRunning) {
            clearInterval(mockSimulationInterval);
            mockSimulationInterval = null;
            return;
        }

        mockData.sensors.forEach(s => {
            if (s.modoOperacion === 'APAGADO') return;

            let val = s.ultimoValor || 50;
            if (s.tipo.toLowerCase().includes('humedad')) {
                val += (Math.random() - 0.5) * 4;
                val = Math.max(10, Math.min(100, parseFloat(val.toFixed(1))));
                const p = mockData.parcelas.find(parcel => s.parcelas.some(sp => sp.id === parcel.id));
                if (p) {
                    p.currentHumidity = val;
                    p.currentHealth = val >= 40 && val <= 80 ? Math.min(100, (p.currentHealth || 90) + 1) : Math.max(30, (p.currentHealth || 90) - 2);
                }
            } else if (s.tipo.toLowerCase().includes('ph')) {
                val += (Math.random() - 0.5) * 0.2;
                val = Math.max(1, Math.min(14, parseFloat(val.toFixed(2))));
                const p = mockData.parcelas.find(parcel => s.parcelas.some(sp => sp.id === parcel.id));
                if (p) p.currentPh = val;
            } else if (s.tipo.toLowerCase().includes('temp') || s.tipo.toLowerCase().includes('clima')) {
                val += (Math.random() - 0.5) * 1.5;
                val = Math.max(10, Math.min(45, parseFloat(val.toFixed(1))));
                const p = mockData.parcelas.find(parcel => s.parcelas.some(sp => sp.id === parcel.id));
                if (p) p.currentTemperature = val;
            }

            s.ultimoValor = val;

            mockData.events.push({
                id: mockData.events.length + 1,
                eventType: "SENSOR_READING",
                origin: s.nombre,
                payload: JSON.stringify({ value: val }),
                occurredOn: new Date().toISOString()
            });
        });

        // Recalculate averages for mock stats
        const activeHumidities = mockData.parcelas.map(p => p.currentHumidity).filter(h => h !== undefined);
        const activePhs = mockData.parcelas.map(p => p.currentPh).filter(p => p !== undefined);
        const activeHealths = mockData.parcelas.map(p => p.currentHealth).filter(h => h !== undefined);
        
        if (activeHumidities.length > 0) {
            mockData.stats.humedadPromedio = activeHumidities.reduce((a, b) => a + b, 0) / activeHumidities.length;
        }
        if (activePhs.length > 0) {
            mockData.stats.phPromedio = activePhs.reduce((a, b) => a + b, 0) / activePhs.length;
        }
        if (activeHealths.length > 0) {
            mockData.stats.saludPromedio = activeHealths.reduce((a, b) => a + b, 0) / activeHealths.length;
        }

        if (mockData.events.length > 50) {
            mockData.events = mockData.events.slice(-50);
        }
    }, 4000);
}

export async function handleMockRequest(url, options) {
    console.log('[MOCK API] Intercepted request:', url, options?.method || 'GET');
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(300); // Simulate network latency

    const createResponse = (body, status = 200) => {
        return new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' }
        });
    };

    if (url.includes('/api/auth/login')) {
        try {
            const body = options?.body ? JSON.parse(options.body) : {};
            const userEmail = body.email || "test@magdalena.ag";
            const userName = userEmail.split('@')[0];
            const displayName = userName.charAt(0).toUpperCase() + userName.slice(1) + " (APK)";
            return createResponse({
                email: userEmail,
                name: displayName,
                token: "mock-jwt-token"
            });
        } catch (e) {
            return createResponse(mockData.login);
        }
    }
    
    if (url.includes('/api/parcelas/stats')) {
        return createResponse(mockData.stats);
    }
    
    if (url.includes('/api/parcelas') && (!options || options.method === 'GET' || !options.method)) {
        return createResponse(mockData.parcelas);
    }
    
    if (url.includes('/api/parcelas') && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        const newParcela = {
            ...body,
            id: 'mock-' + Date.now(),
            estado: 'Activa',
            currentHumidity: 50,
            currentTemperature: 25,
            currentPh: 7,
            currentHealth: 100
        };
        mockData.parcelas.push(newParcela);
        return createResponse(newParcela, 201);
    }
    
    if (url.includes('/api/parcelas') && options?.method === 'DELETE') {
        const parts = url.split('/');
        const id = parts[parts.length - 1];
        mockData.parcelas = mockData.parcelas.filter(p => p.id !== id);
        return createResponse({ success: true });
    }
    
    if (url.includes('/api/events/clear')) {
        mockData.events = [];
        return createResponse({ success: true });
    }
    
    if (url.includes('/api/events')) {
        return createResponse(mockData.events);
    }
    
    if (url.includes('/api/sensors/simulate/status')) {
        return createResponse({ running: mockSimulationRunning });
    }

    if (url.includes('/api/sensors/simulate/stop')) {
        mockSimulationRunning = false;
        if (mockSimulationInterval) {
            clearInterval(mockSimulationInterval);
            mockSimulationInterval = null;
        }
        return createResponse({ success: true });
    }

    if (url.includes('/api/sensors/simulate')) {
        mockSimulationRunning = true;
        startMockSimulation();
        return createResponse({ success: true });
    }

    if (url.includes('/api/sensors/clear')) {
        mockData.sensors = [];
        return createResponse({ success: true });
    }

    if (url.includes('/api/sensors') && (!options || options.method === 'GET' || !options.method)) {
        return createResponse(mockData.sensors);
    }
    
    if (url.includes('/api/sensors') && options?.method === 'POST') {
        if (!url.includes('reading')) {
            const body = JSON.parse(options.body);
            mockData.sensors.push(body);
            return createResponse(body, 201);
        } else {
            return createResponse({ success: true });
        }
    }

    if (url.includes('/api/sensors') && options?.method === 'PUT') {
        const parts = url.split('/');
        const id = parts[parts.length - 1];
        const body = JSON.parse(options.body);
        mockData.sensors = mockData.sensors.map(s => String(s.id) === String(id) ? body : s);
        return createResponse(body);
    }

    if (url.includes('/api/sensors') && options?.method === 'DELETE') {
        const parts = url.split('/');
        const id = parts[parts.length - 1];
        mockData.sensors = mockData.sensors.filter(s => String(s.id) !== String(id));
        return createResponse({ success: true });
    }

    return createResponse({ error: "Endpoint no mockeado" }, 404);
}
