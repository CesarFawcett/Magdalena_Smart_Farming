package com.magdalena.application.usecases;

import com.magdalena.infrastructure.adapters.persistence.JpaParcelaRepository;
import com.magdalena.infrastructure.adapters.persistence.ParcelaEntity;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GetParcelasUseCase {

    private final JpaParcelaRepository repository;

    public GetParcelasUseCase(JpaParcelaRepository repository) {
        this.repository = repository;
    }

    public List<ParcelaEntity> execute() {
        return repository.findAll();
    }
}
