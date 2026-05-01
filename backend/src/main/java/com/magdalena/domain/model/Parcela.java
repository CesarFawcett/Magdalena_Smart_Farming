package com.magdalena.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Parcela {
    private UUID id;
    private String nombre;
    private String ubicacion;
    private Double latitud;
    private Double longitud;
    private Double areaTotal;
    private String unidadArea; // hectáreas, m2
    private String tipoSuelo;
    private String estado; // Activa, Inactiva
    private LocalDateTime fechaRegistro;
    private Boolean enMonitoreo;
    
    // Mock fields for stats integration
    private Double currentHealth;
    private Double currentHumidity;
    private Double currentPh;
    private Double currentTemperature;

    private java.util.List<java.util.UUID> sensorIds;
}
