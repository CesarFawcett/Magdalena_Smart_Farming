package com.magdalena.infrastructure.adapters.persistence;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "parcelas")
@Data
public class ParcelaEntity {
    @Id
    private UUID id;

    @Column(nullable = false)
    private String nombre;

    private String ubicacion;
    private Double latitud;
    private Double longitud;
    private Double areaTotal;
    private String unidadArea;
    private String tipoSuelo;
    private String estado;
    private LocalDateTime fechaRegistro;
    private Boolean enMonitoreo;

    private Double currentHealth;
    private Double currentHumidity;
    private Double currentPh;
    private Double currentTemperature;
}
