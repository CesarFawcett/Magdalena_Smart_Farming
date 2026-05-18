package com.magdalena.application.usecases;

import com.magdalena.domain.events.StoredEvent;
import com.magdalena.domain.ports.EventStorePort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GetEventHistoryUseCase {

    private final EventStorePort eventStorePort;

    public GetEventHistoryUseCase(EventStorePort eventStorePort) {
        this.eventStorePort = eventStorePort;
    }

    public List<StoredEvent> execute() {
        return eventStorePort.findAll();
    }
}
