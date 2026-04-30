package com.magdalena.application.usecases;

import com.magdalena.infrastructure.adapters.persistence.EventStoreEntity;
import com.magdalena.infrastructure.adapters.persistence.JpaEventStoreRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GetEventHistoryUseCase {

    private final JpaEventStoreRepository repository;

    public GetEventHistoryUseCase(JpaEventStoreRepository repository) {
        this.repository = repository;
    }

    public List<EventStoreEntity> execute() {
        return repository.findAll(Sort.by(Sort.Direction.DESC, "occurredOn"));
    }
}
