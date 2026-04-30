package com.magdalena.infrastructure.adapters.web;

import com.magdalena.domain.events.ManualReadingEvent;
import com.magdalena.domain.ports.EventStorePort;
import com.magdalena.infrastructure.adapters.persistence.JpaSensorRepository;
import com.magdalena.infrastructure.adapters.persistence.JpaParcelaRepository;
import com.magdalena.infrastructure.adapters.persistence.SensorEntity;
import com.magdalena.application.services.SimulationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/sensors")
@CrossOrigin(origins = "*")
public class SensorController {

    private final JpaSensorRepository sensorRepository;
    private final JpaParcelaRepository parcelaRepository;
    private final EventStorePort eventStore;
    private final SimulationService simulationService;

    public SensorController(JpaSensorRepository sensorRepository, 
                            JpaParcelaRepository parcelaRepository,
                            EventStorePort eventStore,
                            SimulationService simulationService) {
        this.sensorRepository = sensorRepository;
        this.parcelaRepository = parcelaRepository;
        this.eventStore = eventStore;
        this.simulationService = simulationService;
    }

    @PostMapping("/{id}/reading")
    public ResponseEntity<Void> recordReading(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        var sensorOpt = sensorRepository.findById(id);
        
        if (sensorOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SensorEntity sensor = sensorOpt.get();
        String rawValue = payload.get("value");
        eventStore.save(new ManualReadingEvent(id, sensor.getNombre(), rawValue));
        
        try {
            String numericPart = rawValue.split(" ")[0];
            sensor.setUltimoValor(Double.parseDouble(numericPart));
            sensorRepository.save(sensor);
        } catch (Exception e) {
            // Log error if needed
        }
        
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public List<SensorEntity> getAll() {
        return sensorRepository.findAll();
    }

    @PostMapping("/simulate")
    public ResponseEntity<String> simulate(@RequestParam int intervalSeconds) {
        simulationService.startSimulation(intervalSeconds);
        System.out.println("🚀 Simulación iniciada con intervalo de: " + intervalSeconds + " segundos");
        return ResponseEntity.ok("Simulación iniciada con éxito");
    }

    @PostMapping("/clear")
    public ResponseEntity<Void> clearAllReadings() {
        // Reset Sensors
        var sensors = sensorRepository.findAll();
        sensors.forEach(s -> {
            s.setUltimoValor(0.0);
            sensorRepository.save(s);
        });

        // Reset Parcel Stats
        var parcels = parcelaRepository.findAll();
        parcels.forEach(p -> {
            p.setCurrentHealth(0.0);
            p.setCurrentHumidity(0.0);
            p.setCurrentPh(0.0);
            parcelaRepository.save(p);
        });

        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<SensorEntity> update(@PathVariable UUID id, @RequestBody SensorEntity updated) {
        return sensorRepository.findById(id).map(sensor -> {
            sensor.setModoOperacion(updated.getModoOperacion());
            sensor.setEstado(updated.getEstado());
            return ResponseEntity.ok(sensorRepository.save(sensor));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        sensorRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
