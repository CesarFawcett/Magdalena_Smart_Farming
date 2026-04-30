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
    private ScheduledExecutorService scheduler;
    private final Random random = new Random();

    public SimulationService(JpaSensorRepository sensorRepository, 
                             JpaParcelaRepository parcelaRepository,
                             EventStorePort eventStore) {
        this.sensorRepository = sensorRepository;
        this.parcelaRepository = parcelaRepository;
        this.eventStore = eventStore;
    }

    public synchronized void startSimulation(int intervalSeconds) {
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdownNow();
        }

        scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleAtFixedRate(this::generateData, 0, intervalSeconds, TimeUnit.SECONDS);
    }

    private void generateData() {
        List<SensorEntity> activeSensors = sensorRepository.findAll().stream()
                .filter(s -> "ENCENDIDO".equals(s.getModoOperacion()))
                .toList();

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
            eventStore.save(new ManualReadingEvent(sensor.getId(), sensor.getNombre(), formattedValue + " (Simulado)"));
        }
    }

    private void updateParcelaStats(ParcelaEntity parcela, SensorEntity sensor, double value) {
        String type = sensor.getTipo().toLowerCase();
        if (type.contains("humedad")) {
            parcela.setCurrentHumidity(value);
        } else if (type.contains("ph")) {
            parcela.setCurrentPh(value);
        } else if (type.contains("temp") || type.contains("salud")) {
            // Adjust health based on extreme values or just update it
            parcela.setCurrentHealth(Math.max(0, Math.min(100, value)));
        }
    }

    private double calculateNewValue(SensorEntity sensor) {
        double current = sensor.getUltimoValor() != null ? sensor.getUltimoValor() : 0.0;
        double variation = (random.nextDouble() - 0.5) * 2.0; // +/- 1.0

        return switch (sensor.getTipo().toLowerCase()) {
            case "humedad" -> Math.max(0, Math.min(100, current + variation));
            case "ph" -> Math.max(0, Math.min(14, current + (variation * 0.1)));
            case "temperatura" -> Math.max(10, Math.min(45, current + variation));
            case "gateway" -> -70 - random.nextInt(30); // Signal strength
            default -> current + variation;
        };
    }
}
