package com.magdalena.application.usecases;

import com.magdalena.domain.events.ParcelaCreatedEvent;
import com.magdalena.domain.model.Parcela;
import com.magdalena.domain.ports.EventPublisherPort;
import com.magdalena.domain.ports.EventStorePort;
import com.magdalena.domain.ports.ParcelaRepositoryPort;
import com.magdalena.domain.ports.SensorRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class CreateParcelaUseCase {

    private final EventStorePort eventStore;
    private final EventPublisherPort eventPublisher;
    private final ParcelaRepositoryPort readRepository;
    private final SensorRepositoryPort sensorRepository;

    public CreateParcelaUseCase(EventStorePort eventStore, 
                               EventPublisherPort eventPublisher, 
                               ParcelaRepositoryPort readRepository,
                               SensorRepositoryPort sensorRepository) {
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

        // 3. Update Read Model
        Parcela savedParcela = readRepository.save(parcelaData);

        // 4. Associate Sensors
        if (parcelaData.getSensorIds() != null && !parcelaData.getSensorIds().isEmpty()) {
            parcelaData.getSensorIds().forEach(sensorId -> {
                sensorRepository.findById(sensorId).ifPresent(sensor -> {
                    sensor.setParcelaId(savedParcela.getId());
                    sensorRepository.save(sensor);
                });
            });
        }

        return savedParcela;
    }
}
