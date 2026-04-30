package com.magdalena.domain.events;

import java.util.UUID;

public class ParcelaDeletedEvent extends DomainEvent {
    private final UUID parcelaId;

    public ParcelaDeletedEvent(UUID parcelaId, String origin) {
        super(origin);
        this.parcelaId = parcelaId;
    }

    public UUID getParcelaId() {
        return parcelaId;
    }

    @Override
    public String getEventType() {
        return "PARCELA_DELETED";
    }
}
