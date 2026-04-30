package com.magdalena.infrastructure.adapters.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import java.util.List;

@Repository
public interface JpaSensorRepository extends JpaRepository<SensorEntity, UUID> {
    List<SensorEntity> findByParcelas_Id(UUID parcelaId);
    List<SensorEntity> findByEstado(String estado);
}
