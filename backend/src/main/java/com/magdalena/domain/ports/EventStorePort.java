package com.magdalena.domain.ports;

import com.magdalena.domain.events.DomainEvent;
import com.magdalena.domain.events.StoredEvent;
import java.util.List;

public interface EventStorePort {
    void save(DomainEvent event);
    void deleteAll();
    List<StoredEvent> findAll();
}
