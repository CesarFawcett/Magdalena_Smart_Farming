package com.magdalena.infrastructure.adapters.persistence;

import com.magdalena.domain.model.Parcela;
import com.magdalena.domain.ports.ParcelaRepositoryPort;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class PostgresParcelaRepositoryAdapter implements ParcelaRepositoryPort {

    private final JpaParcelaRepository repository;

    public PostgresParcelaRepositoryAdapter(JpaParcelaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Parcela save(Parcela parcela) {
        ParcelaEntity entity = toEntity(parcela);
        ParcelaEntity savedEntity = repository.save(entity);
        return toDomain(savedEntity);
    }

    @Override
    public List<Parcela> findAll() {
        return repository.findAll().stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Parcela> findById(UUID id) {
        return repository.findById(id).map(this::toDomain);
    }

    @Override
    public void deleteById(UUID id) {
        repository.deleteById(id);
    }

    private ParcelaEntity toEntity(Parcela parcela) {
        if (parcela == null) return null;
        ParcelaEntity entity = new ParcelaEntity();
        entity.setId(parcela.getId());
        entity.setNombre(parcela.getNombre());
        entity.setUbicacion(parcela.getUbicacion());
        entity.setLatitud(parcela.getLatitud());
        entity.setLongitud(parcela.getLongitud());
        entity.setAreaTotal(parcela.getAreaTotal());
        entity.setUnidadArea(parcela.getUnidadArea());
        entity.setTipoSuelo(parcela.getTipoSuelo());
        entity.setEstado(parcela.getEstado());
        entity.setFechaRegistro(parcela.getFechaRegistro());
        entity.setEnMonitoreo(parcela.getEnMonitoreo());
        entity.setCurrentHealth(parcela.getCurrentHealth());
        entity.setCurrentHumidity(parcela.getCurrentHumidity());
        entity.setCurrentPh(parcela.getCurrentPh());
        entity.setCurrentTemperature(parcela.getCurrentTemperature());
        return entity;
    }

    private Parcela toDomain(ParcelaEntity entity) {
        if (entity == null) return null;
        return Parcela.builder()
                .id(entity.getId())
                .nombre(entity.getNombre())
                .ubicacion(entity.getUbicacion())
                .latitud(entity.getLatitud())
                .longitud(entity.getLongitud())
                .areaTotal(entity.getAreaTotal())
                .unidadArea(entity.getUnidadArea())
                .tipoSuelo(entity.getTipoSuelo())
                .estado(entity.getEstado())
                .fechaRegistro(entity.getFechaRegistro())
                .enMonitoreo(entity.getEnMonitoreo())
                .currentHealth(entity.getCurrentHealth())
                .currentHumidity(entity.getCurrentHumidity())
                .currentPh(entity.getCurrentPh())
                .currentTemperature(entity.getCurrentTemperature())
                .build();
    }
}
