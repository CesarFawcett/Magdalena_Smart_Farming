package com.magdalena.infrastructure.adapters.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.magdalena.domain.events.DomainEvent;
import com.magdalena.domain.ports.EventStorePort;
import org.springframework.stereotype.Component;

@Component
public class PostgresEventStoreAdapter implements EventStorePort {

    private final JpaEventStoreRepository repository;
    private final ObjectMapper objectMapper;

    public PostgresEventStoreAdapter(JpaEventStoreRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void save(DomainEvent event) {
        try {
            EventStoreEntity entity = new EventStoreEntity();
            entity.setEventId(event.getEventId());
            entity.setEventType(event.getEventType());
            entity.setOccurredOn(event.getOccurredOn());
            entity.setOrigin(event.getOrigin());
            entity.setPayload(objectMapper.writeValueAsString(event));
            repository.save(entity);
        } catch (Exception e) {
            throw new RuntimeException("Error saving event to store", e);
        }
    }

    @Override
    public void deleteAll() {
        repository.deleteAll();
    }
}
