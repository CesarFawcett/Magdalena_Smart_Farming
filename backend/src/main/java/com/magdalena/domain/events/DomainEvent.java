package com.magdalena.domain.events;

import java.time.LocalDateTime;
import java.util.UUID;

public abstract class DomainEvent {
    private final UUID eventId;
    private final LocalDateTime occurredOn;
    private final String origin;

    protected DomainEvent() {
        this("Sistema Central");
    }

    protected DomainEvent(String origin) {
        this.eventId = UUID.randomUUID();
        this.occurredOn = LocalDateTime.now();
        this.origin = origin;
    }

    public UUID getEventId() {
        return eventId;
    }

    public LocalDateTime getOccurredOn() {
        return occurredOn;
    }

    public String getOrigin() {
        return origin;
    }

    public abstract String getEventType();
}
