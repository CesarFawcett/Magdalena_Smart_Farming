package com.magdalena.domain.events;

import com.magdalena.domain.model.Parcela;

public class ParcelaCreatedEvent extends DomainEvent {
    private final Parcela parcela;

    public ParcelaCreatedEvent(Parcela parcela) {
        this(parcela, "Web Dashboard");
    }

    public ParcelaCreatedEvent(Parcela parcela, String origin) {
        super(origin);
        this.parcela = parcela;
    }

    public Parcela getParcela() {
        return parcela;
    }

    @Override
    public String getEventType() {
        return "PARCELA_CREATED";
    }
}
