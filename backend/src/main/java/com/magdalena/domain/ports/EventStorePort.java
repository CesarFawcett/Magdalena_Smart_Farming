package com.magdalena.domain.ports;

import com.magdalena.domain.events.DomainEvent;

public interface EventStorePort {
    void save(DomainEvent event);
    void deleteAll();
}
