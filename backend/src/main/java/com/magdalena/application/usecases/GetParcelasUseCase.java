package com.magdalena.application.usecases;

import com.magdalena.domain.model.Parcela;
import com.magdalena.domain.ports.ParcelaRepositoryPort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GetParcelasUseCase {

    private final ParcelaRepositoryPort repository;

    public GetParcelasUseCase(ParcelaRepositoryPort repository) {
        this.repository = repository;
    }

    public List<Parcela> execute() {
        return repository.findAll();
    }
}
