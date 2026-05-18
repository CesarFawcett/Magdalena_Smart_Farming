package com.magdalena.infrastructure.adapters.persistence;

import com.magdalena.domain.model.Parcela;
import com.magdalena.domain.model.Sensor;
import com.magdalena.domain.ports.SensorRepositoryPort;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class PostgresSensorRepositoryAdapter implements SensorRepositoryPort {

    private final JpaSensorRepository repository;

    public PostgresSensorRepositoryAdapter(JpaSensorRepository repository) {
        this.repository = repository;
    }

    @Override
    public Sensor save(Sensor sensor) {
        SensorEntity entity = toEntity(sensor);
        SensorEntity savedEntity = repository.save(entity);
        return toDomain(savedEntity);
    }

    @Override
    public List<Sensor> findAll() {
        return repository.findAll().stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Sensor> findById(UUID id) {
        return repository.findById(id).map(this::toDomain);
    }

    @Override
    public void deleteById(UUID id) {
        repository.deleteById(id);
    }

    @Override
    public List<Sensor> findByParcelaId(UUID parcelaId) {
        return repository.findByParcelas_Id(parcelaId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<Sensor> findByEstado(String estado) {
        return repository.findByEstado(estado).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    private SensorEntity toEntity(Sensor sensor) {
        if (sensor == null) return null;
        SensorEntity entity = new SensorEntity();
        entity.setId(sensor.getId());
        entity.setNombre(sensor.getNombre());
        entity.setTipo(sensor.getTipo());
        entity.setUnidad(sensor.getUnidad());
        entity.setCropId(sensor.getCropId());
        entity.setEstado(sensor.getEstado());
        entity.setEnLinea(sensor.getEnLinea());
        entity.setModoOperacion(sensor.getModoOperacion());
        entity.setUltimoValor(sensor.getUltimoValor());
        entity.setFechaInstalacion(sensor.getFechaInstalacion());

        if (sensor.getParcelas() != null) {
            java.util.Set<ParcelaEntity> entityParcelas = new java.util.HashSet<>();
            sensor.getParcelas().forEach(p -> {
                ParcelaEntity pe = new ParcelaEntity();
                pe.setId(p.getId());
                pe.setNombre(p.getNombre());
                pe.setUbicacion(p.getUbicacion());
                pe.setLatitud(p.getLatitud());
                pe.setLongitud(p.getLongitud());
                pe.setAreaTotal(p.getAreaTotal());
                pe.setUnidadArea(p.getUnidadArea());
                pe.setTipoSuelo(p.getTipoSuelo());
                pe.setEstado(p.getEstado());
                pe.setFechaRegistro(p.getFechaRegistro());
                pe.setEnMonitoreo(p.getEnMonitoreo());
                pe.setCurrentHealth(p.getCurrentHealth());
                pe.setCurrentHumidity(p.getCurrentHumidity());
                pe.setCurrentPh(p.getCurrentPh());
                pe.setCurrentTemperature(p.getCurrentTemperature());
                entityParcelas.add(pe);
            });
            entity.setParcelas(entityParcelas);
        } else if (sensor.getParcelaId() != null) {
            ParcelaEntity p = new ParcelaEntity();
            p.setId(sensor.getParcelaId());
            entity.setParcelas(new java.util.HashSet<>(java.util.List.of(p)));
        }

        return entity;
    }

    private Sensor toDomain(SensorEntity entity) {
        if (entity == null) return null;
        Sensor sensor = new Sensor();
        sensor.setId(entity.getId());
        sensor.setNombre(entity.getNombre());
        sensor.setTipo(entity.getTipo());
        sensor.setUnidad(entity.getUnidad());
        sensor.setCropId(entity.getCropId());
        sensor.setEstado(entity.getEstado());
        sensor.setEnLinea(entity.getEnLinea());
        sensor.setModoOperacion(entity.getModoOperacion());
        sensor.setUltimoValor(entity.getUltimoValor());
        sensor.setFechaInstalacion(entity.getFechaInstalacion());

        if (entity.getParcelas() != null) {
            java.util.List<Parcela> domainParcelas = new java.util.ArrayList<>();
            entity.getParcelas().forEach(pe -> {
                domainParcelas.add(Parcela.builder()
                        .id(pe.getId())
                        .nombre(pe.getNombre())
                        .ubicacion(pe.getUbicacion())
                        .latitud(pe.getLatitud())
                        .longitud(pe.getLongitud())
                        .areaTotal(pe.getAreaTotal())
                        .unidadArea(pe.getUnidadArea())
                        .tipoSuelo(pe.getTipoSuelo())
                        .estado(pe.getEstado())
                        .fechaRegistro(pe.getFechaRegistro())
                        .enMonitoreo(pe.getEnMonitoreo())
                        .currentHealth(pe.getCurrentHealth())
                        .currentHumidity(pe.getCurrentHumidity())
                        .currentPh(pe.getCurrentPh())
                        .currentTemperature(pe.getCurrentTemperature())
                        .build());
            });
            sensor.setParcelas(domainParcelas);
            if (!domainParcelas.isEmpty()) {
                sensor.setParcelaId(domainParcelas.get(0).getId());
            }
        }

        return sensor;
    }
}
