package com.magdalena.domain.ports;

import com.magdalena.domain.events.DomainEvent;

public interface EventPublisherPort {
    void publish(DomainEvent event);
}
