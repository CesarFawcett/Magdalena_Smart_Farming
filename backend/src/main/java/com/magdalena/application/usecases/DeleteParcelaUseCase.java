package com.magdalena.application.usecases;

import com.magdalena.domain.events.ParcelaDeletedEvent;
import com.magdalena.domain.ports.EventStorePort;
import com.magdalena.infrastructure.adapters.persistence.JpaParcelaRepository;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class DeleteParcelaUseCase {

    private final JpaParcelaRepository repository;
    private final EventStorePort eventStore;

    public DeleteParcelaUseCase(JpaParcelaRepository repository, EventStorePort eventStore) {
        this.repository = repository;
        this.eventStore = eventStore;
    }

    public void execute(UUID id) {
        repository.deleteById(id);
        eventStore.save(new ParcelaDeletedEvent(id, "Web Dashboard"));
    }
}
