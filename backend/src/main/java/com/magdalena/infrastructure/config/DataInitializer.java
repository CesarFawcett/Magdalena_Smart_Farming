package com.magdalena.infrastructure.config;

import com.magdalena.infrastructure.adapters.persistence.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initData(JpaParcelaRepository parcelaRepo, JpaSensorRepository sensorRepo) {
        return args -> {
            // 1. Create Parcels if they don't exist
            if (parcelaRepo.count() == 0) {
                ParcelaEntity p1 = new ParcelaEntity();
                p1.setId(UUID.randomUUID());
                p1.setNombre("Lote Banano Exportación");
                p1.setUbicacion("Zona Norte - Magdalena");
                p1.setTipoSuelo("Arcilloso");
                p1.setAreaTotal(15.5);
                p1.setUnidadArea("ha");
                p1.setLatitud(10.456);
                p1.setLongitud(-74.123);
                p1.setEstado("Activo");
                p1.setFechaRegistro(LocalDateTime.now());
                p1.setEnMonitoreo(true);
                p1.setCurrentHealth(85.0);
                p1.setCurrentHumidity(45.0);
                p1.setCurrentPh(6.5);

                ParcelaEntity p2 = new ParcelaEntity();
                p2.setId(UUID.randomUUID());
                p2.setNombre("Sector Cacao Premium");
                p2.setUbicacion("Zona Sur - Aracataca");
                p2.setTipoSuelo("Franco-Arenoso");
                p2.setAreaTotal(10.2);
                p2.setUnidadArea("ha");
                p2.setLatitud(10.458);
                p2.setLongitud(-74.125);
                p2.setEstado("Activo");
                p2.setFechaRegistro(LocalDateTime.now());
                p2.setEnMonitoreo(true);
                p2.setCurrentHealth(92.0);
                p2.setCurrentHumidity(55.0);
                p2.setCurrentPh(5.8);

                ParcelaEntity p3 = new ParcelaEntity();
                p3.setId(UUID.randomUUID());
                p3.setNombre("Invernadero Experimental");
                p3.setUbicacion("Centro de I+D");
                p3.setTipoSuelo("Orgánico");
                p3.setAreaTotal(2.0);
                p3.setUnidadArea("ha");
                p3.setLatitud(10.460);
                p3.setLongitud(-74.127);
                p3.setEstado("Activo");
                p3.setFechaRegistro(LocalDateTime.now());
                p3.setEnMonitoreo(true);
                p3.setCurrentHealth(78.0);
                p3.setCurrentHumidity(65.0);
                p3.setCurrentPh(7.0);

                parcelaRepo.saveAll(List.of(p1, p2, p3));
                System.out.println("✅ 3 Parcelas iniciales creadas con éxito.");
            }

            // 2. Create Sensors if they don't exist
            if (sensorRepo.count() == 0) {
                List<ParcelaEntity> parcels = parcelaRepo.findAll();
                
                // Sensor 1: Moisture
                SensorEntity s1 = createSensor("Nodo Humedad Banano 01", "Humedad", "%", "Activo", true, "ENCENDIDO", 45.5, parcels.subList(0, 1));
                
                // Sensor 2: pH
                SensorEntity s2 = createSensor("Sonda pH Digital Cacao", "pH", "pH", "Activo", true, "ENCENDIDO", 6.2, parcels.subList(1, 2));
                
                // Sensor 3: Temp
                SensorEntity s3 = createSensor("Monitor Ambiental Invernadero", "Temperatura", "°C", "Mantenimiento", false, "ENCENDIDO", 28.4, parcels.subList(2, 3));
                
                // Sensor 4: Gateway
                SensorEntity s4 = createSensor("Gateway LoRa Central", "Gateway", "dBm", "Activo", true, "ENCENDIDO", -85.0, parcels);
                
                // Sensor 5: Multiparameter
                SensorEntity s5 = createSensor("Nodo Multiparamétrico Pro", "Multiparamétrico", "MIX", "Activo", true, "MANUAL", 0.0, List.of(parcels.get(0), parcels.get(2)));

                sensorRepo.saveAll(List.of(s1, s2, s3, s4, s5));
                System.out.println("✅ 5 Sensores especializados creados y vinculados.");
            }
        };
    }

    private SensorEntity createSensor(String name, String type, String unit, String status, boolean online, String mode, Double value, List<ParcelaEntity> assignedParcels) {
        SensorEntity s = new SensorEntity();
        s.setId(UUID.randomUUID());
        s.setNombre(name);
        s.setTipo(type);
        s.setUnidad(unit);
        s.setEstado(status);
        s.setEnLinea(online);
        s.setModoOperacion(mode);
        s.setUltimoValor(value);
        s.setFechaInstalacion(LocalDateTime.now().minusDays(new java.util.Random().nextInt(365)));
        s.setParcelas(new HashSet<>(assignedParcels));
        return s;
    }
}
