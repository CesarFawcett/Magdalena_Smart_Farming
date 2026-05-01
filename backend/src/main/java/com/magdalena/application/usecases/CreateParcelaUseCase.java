package com.magdalena.application.usecases;

import com.magdalena.domain.events.ParcelaCreatedEvent;
import com.magdalena.domain.model.Parcela;
import com.magdalena.domain.ports.EventPublisherPort;
import com.magdalena.domain.ports.EventStorePort;
import com.magdalena.infrastructure.adapters.persistence.JpaParcelaRepository;
import com.magdalena.infrastructure.adapters.persistence.ParcelaEntity;
import com.magdalena.infrastructure.adapters.persistence.JpaSensorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class CreateParcelaUseCase {

    private final EventStorePort eventStore;
    private final EventPublisherPort eventPublisher;
    private final JpaParcelaRepository readRepository;
    private final JpaSensorRepository sensorRepository;

    public CreateParcelaUseCase(EventStorePort eventStore, 
                               EventPublisherPort eventPublisher, 
                               JpaParcelaRepository readRepository,
                               JpaSensorRepository sensorRepository) {
        this.eventStore = eventStore;
        this.eventPublisher = eventPublisher;
        this.readRepository = readRepository;
        this.sensorRepository = sensorRepository;
    }

    @Transactional

    public Parcela execute(Parcela parcelaData) {
        // Initialize Parcela
        parcelaData.setId(UUID.randomUUID());
        parcelaData.setFechaRegistro(LocalDateTime.now());
        if (parcelaData.getEstado() == null) parcelaData.setEstado("Activa");
        if (parcelaData.getEnMonitoreo() == null) parcelaData.setEnMonitoreo(true);
        
        // Initialize mock measurements
        parcelaData.setCurrentHealth(parcelaData.getEstado().equals("Activa") ? 90.0 : 40.0);
        parcelaData.setCurrentHumidity(42.0);
        parcelaData.setCurrentPh(6.2);
        parcelaData.setCurrentTemperature(24.0);

        // 1. Save Event to Store (Event Sourcing)
        ParcelaCreatedEvent event = new ParcelaCreatedEvent(parcelaData);
        eventStore.save(event);

        // 2. Publish Event (EDA)
        eventPublisher.publish(event);

        // 3. Update Read Model (Sync Projection for now)
        // In a complex system, this would be an async listener. 
        // For simplicity, we update it here.
        ParcelaEntity entity = new ParcelaEntity();
        entity.setId(parcelaData.getId());
        entity.setNombre(parcelaData.getNombre());
        entity.setUbicacion(parcelaData.getUbicacion());
        entity.setLatitud(parcelaData.getLatitud());
        entity.setLongitud(parcelaData.getLongitud());
        entity.setAreaTotal(parcelaData.getAreaTotal());
        entity.setUnidadArea(parcelaData.getUnidadArea());
        entity.setTipoSuelo(parcelaData.getTipoSuelo());
        entity.setEstado(parcelaData.getEstado());
        entity.setFechaRegistro(parcelaData.getFechaRegistro());
        entity.setEnMonitoreo(parcelaData.getEnMonitoreo());
        entity.setCurrentHealth(parcelaData.getCurrentHealth());
        entity.setCurrentHumidity(parcelaData.getCurrentHumidity());
        entity.setCurrentPh(parcelaData.getCurrentPh());
        entity.setCurrentTemperature(parcelaData.getCurrentTemperature());
        ParcelaEntity savedParcela = readRepository.save(entity);

        // 4. Associate Sensors
        if (parcelaData.getSensorIds() != null && !parcelaData.getSensorIds().isEmpty()) {
            parcelaData.getSensorIds().forEach(sensorId -> {
                sensorRepository.findById(sensorId).ifPresent(sensor -> {
                    if (sensor.getParcelas() == null) {
                        sensor.setParcelas(new java.util.HashSet<>());
                    }
                    sensor.getParcelas().add(savedParcela);
                    sensorRepository.save(sensor);
                });
            });
        }

        readRepository.save(entity);

        return parcelaData;
    }
}
