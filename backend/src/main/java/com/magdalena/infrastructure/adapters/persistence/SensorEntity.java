package com.magdalena.infrastructure.adapters.persistence;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sensors")
@Data
public class SensorEntity {
    
    @Id
    private UUID id;
    
    @Column(nullable = false)
    private String nombre;
    
    @Column(nullable = false)
    private String tipo;
    
    @Column(nullable = false)
    private String unidad;
    
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "sensor_parcelas",
        joinColumns = @JoinColumn(name = "sensor_id"),
        inverseJoinColumns = @JoinColumn(name = "parcela_id")
    )
    private java.util.Set<ParcelaEntity> parcelas;
    
    @Column
    private UUID cropId;
    
    @Column(nullable = false)
    private String estado;
    
    @Column(nullable = false)
    private Boolean enLinea;
    
    @Column(nullable = false)
    private String modoOperacion; // ENCENDIDO, APAGADO, MANUAL
    
    @Column
    private Double ultimoValor;
    
    @Column(nullable = false)
    private LocalDateTime fechaInstalacion;
}
