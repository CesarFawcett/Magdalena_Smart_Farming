package com.magdalena.domain.ports;

import com.magdalena.domain.model.Sensor;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SensorRepositoryPort {
    Sensor save(Sensor sensor);
    List<Sensor> findAll();
    Optional<Sensor> findById(UUID id);
    void deleteById(UUID id);
    List<Sensor> findByParcelaId(UUID parcelaId);
    List<Sensor> findByEstado(String estado);
}
