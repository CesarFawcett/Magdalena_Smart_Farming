package com.magdalena.infrastructure.adapters.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface JpaParcelaRepository extends JpaRepository<ParcelaEntity, UUID> {
}
