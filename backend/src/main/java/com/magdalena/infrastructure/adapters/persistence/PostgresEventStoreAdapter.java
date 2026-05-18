package com.magdalena.infrastructure.adapters.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.magdalena.domain.events.DomainEvent;
import com.magdalena.domain.events.StoredEvent;
import com.magdalena.domain.ports.EventStorePort;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.stream.Collectors;

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

    @Override
    public List<StoredEvent> findAll() {
        return repository.findAll(Sort.by(Sort.Direction.DESC, "occurredOn")).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    private StoredEvent toDomain(EventStoreEntity entity) {
        if (entity == null) return null;
        return StoredEvent.builder()
                .id(entity.getId())
                .eventId(entity.getEventId())
                .eventType(entity.getEventType())
                .payload(entity.getPayload())
                .occurredOn(entity.getOccurredOn())
                .origin(entity.getOrigin())
                .build();
    }
}
