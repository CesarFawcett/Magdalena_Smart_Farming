package com.magdalena.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Sensor {
    private UUID id;
    private String nombre;
    private String tipo;
    private String unidad;
    private UUID parcelaId;
    private UUID cropId;
    private String estado;
    private Boolean enLinea;
    private LocalDateTime fechaInstalacion;
}
