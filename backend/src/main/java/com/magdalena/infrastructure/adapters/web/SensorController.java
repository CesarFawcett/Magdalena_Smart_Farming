package com.magdalena.infrastructure.adapters.web;

import com.magdalena.domain.events.ManualReadingEvent;
import com.magdalena.domain.model.Sensor;
import com.magdalena.domain.ports.EventStorePort;
import com.magdalena.domain.ports.ParcelaRepositoryPort;
import com.magdalena.domain.ports.SensorRepositoryPort;
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

    private final SensorRepositoryPort sensorRepository;
    private final ParcelaRepositoryPort parcelaRepository;
    private final EventStorePort eventStore;
    private final SimulationService simulationService;

    public SensorController(SensorRepositoryPort sensorRepository, 
                            ParcelaRepositoryPort parcelaRepository,
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

        Sensor sensor = sensorOpt.get();
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
    public List<Sensor> getAll() {
        return sensorRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Sensor> save(@RequestBody Sensor sensor) {
        if (sensor.getId() == null) {
            sensor.setId(UUID.randomUUID());
        }
        
        // Ensure parcels are managed if provided
        if (sensor.getParcelas() != null) {
            java.util.List<com.magdalena.domain.model.Parcela> managedParcels = new java.util.ArrayList<>();
            sensor.getParcelas().forEach(p -> {
                parcelaRepository.findById(p.getId()).ifPresent(managedParcels::add);
            });
            sensor.setParcelas(managedParcels);
        }
        
        return ResponseEntity.ok(sensorRepository.save(sensor));
    }

    @PostMapping("/simulate")
    public ResponseEntity<String> simulate(@RequestParam int intervalSeconds) {
        simulationService.startSimulation(intervalSeconds);
        return ResponseEntity.ok("Simulación iniciada con éxito");
    }

    @PostMapping("/simulate/stop")
    public ResponseEntity<Void> stopSimulation() {
        simulationService.stopSimulation();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/simulate/status")
    public ResponseEntity<Map<String, Boolean>> getSimulationStatus() {
        return ResponseEntity.ok(Map.of("running", simulationService.isSimulationRunning()));
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
            p.setCurrentTemperature(0.0);
            parcelaRepository.save(p);
        });

        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Sensor> update(@PathVariable UUID id, @RequestBody Sensor updated) {
        return sensorRepository.findById(id).map(sensor -> {
            sensor.setModoOperacion(updated.getModoOperacion());
            sensor.setEstado(updated.getEstado());
            
            // Allow updating parcels
            if (updated.getParcelas() != null) {
                java.util.List<com.magdalena.domain.model.Parcela> managedParcels = new java.util.ArrayList<>();
                updated.getParcelas().forEach(p -> {
                    parcelaRepository.findById(p.getId()).ifPresent(managedParcels::add);
                });
                sensor.setParcelas(managedParcels);
            }
            
            return ResponseEntity.ok(sensorRepository.save(sensor));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        sensorRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
