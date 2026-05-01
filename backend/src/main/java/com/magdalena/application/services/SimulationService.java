package com.magdalena.application.services;

import com.magdalena.domain.events.ManualReadingEvent;
import com.magdalena.domain.ports.EventStorePort;
import com.magdalena.infrastructure.adapters.persistence.JpaSensorRepository;
import com.magdalena.infrastructure.adapters.persistence.JpaParcelaRepository;
import com.magdalena.infrastructure.adapters.persistence.SensorEntity;
import com.magdalena.infrastructure.adapters.persistence.ParcelaEntity;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class SimulationService {

    private final JpaSensorRepository sensorRepository;
    private final JpaParcelaRepository parcelaRepository;
    private final EventStorePort eventStore;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;
    private ScheduledExecutorService scheduler;
    private final Random random = new Random();

    public SimulationService(JpaSensorRepository sensorRepository, 
                             JpaParcelaRepository parcelaRepository,
                             EventStorePort eventStore,
                             org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate) {
        this.sensorRepository = sensorRepository;
        this.parcelaRepository = parcelaRepository;
        this.eventStore = eventStore;
        this.messagingTemplate = messagingTemplate;
    }

    public synchronized void startSimulation(int intervalSeconds) {
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdownNow();
        }

        scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleAtFixedRate(this::generateData, 0, intervalSeconds, TimeUnit.SECONDS);
    }

    public synchronized void stopSimulation() {
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdownNow();
        }
    }

    public boolean isSimulationRunning() {
        return scheduler != null && !scheduler.isShutdown();
    }

    private void generateData() {
        try {
            List<SensorEntity> activeSensors = sensorRepository.findAll().stream()
                    .filter(s -> "ENCENDIDO".equals(s.getModoOperacion()))
                    .toList();

            if (activeSensors.isEmpty()) {
                System.out.println("⚠️ Simulación activa pero no hay sensores en modo 'AUTOMÁTICO' (ENCENDIDO)");
                return;
            }

            for (SensorEntity sensor : activeSensors) {
                double newValue = calculateNewValue(sensor);
                sensor.setUltimoValor(newValue);
                sensorRepository.save(sensor);

                // Update associated parcels stats
                if (sensor.getParcelas() != null) {
                    for (ParcelaEntity parcela : sensor.getParcelas()) {
                        updateParcelaStats(parcela, sensor, newValue);
                        parcelaRepository.save(parcela);
                    }
                }

                // Save event for history
                String formattedValue = String.format("%.2f %s", newValue, sensor.getUnidad());
                ManualReadingEvent event = new ManualReadingEvent(sensor.getId(), sensor.getNombre(), formattedValue + " (Simulado)");
                eventStore.save(event);

                // Broadcast via WebSocket
                messagingTemplate.convertAndSend("/topic/sensors", event);
                System.out.println("📡 Dato simulado enviado: " + sensor.getNombre() + " -> " + formattedValue);
            }
        } catch (Exception e) {
            System.err.println("❌ Error en el ciclo de simulación: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void updateParcelaStats(ParcelaEntity parcela, SensorEntity sensor, double value) {
        String type = sensor.getTipo().toLowerCase();
        if (type.contains("humedad")) {
            parcela.setCurrentHumidity(value);
        } else if (type.contains("ph")) {
            parcela.setCurrentPh(value);
        } else if (type.contains("temp")) {
            parcela.setCurrentTemperature(value);
        } else if (type.contains("salud")) {
            parcela.setCurrentHealth(Math.max(0, Math.min(100, value)));
            return;
        }

        // Auto-calculate health based on current readings
        double health = 100.0;
        
        // Humidity impact (Ideal: 40% - 80%)
        if (parcela.getCurrentHumidity() != null) {
            double hum = parcela.getCurrentHumidity();
            if (hum < 35 || hum > 85) health -= 15;
            if (hum < 20 || hum > 95) health -= 25;
        }

        // pH impact (Ideal: 5.5 - 7.5)
        if (parcela.getCurrentPh() != null) {
            double ph = parcela.getCurrentPh();
            if (ph < 5.5 || ph > 8.0) health -= 20;
            if (ph < 4.5 || ph > 9.0) health -= 30;
        }

        parcela.setCurrentHealth(Math.max(0, health));
        
        // Update status based on health
        if (health < 50) {
            parcela.setEstado("Alerta");
        } else if (health < 80) {
            parcela.setEstado("Activa (Atención)");
        } else {
            parcela.setEstado("Activa");
        }
    }

    private double calculateNewValue(SensorEntity sensor) {
        double current = sensor.getUltimoValor() != null ? sensor.getUltimoValor() : 0.0;
        double variation = (random.nextDouble() - 0.5) * 2.0; // +/- 1.0

        return switch (sensor.getTipo().toLowerCase()) {
            case "humedad" -> Math.max(0, Math.min(100, current + variation));
            case "ph" -> Math.max(0, Math.min(14, current + (variation * 0.1)));
            case "temperatura" -> Math.max(10, Math.min(45, current + variation));
            case "viento" -> Math.max(0, Math.min(120, current + (variation * 5))); // km/h
            case "clima" -> random.nextInt(100); // % de probabilidad de lluvia
            case "gateway" -> -70 - random.nextInt(30); // Signal strength
            default -> current + variation;
        };
    }
}
