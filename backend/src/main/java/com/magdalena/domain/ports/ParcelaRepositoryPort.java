package com.magdalena.domain.ports;

import com.magdalena.domain.model.Parcela;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParcelaRepositoryPort {
    Parcela save(Parcela parcela);
    List<Parcela> findAll();
    Optional<Parcela> findById(UUID id);
    void deleteById(UUID id);
}
