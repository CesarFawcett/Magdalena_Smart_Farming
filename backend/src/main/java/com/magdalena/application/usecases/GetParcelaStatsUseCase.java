package com.magdalena.application.usecases;

import com.magdalena.domain.model.Parcela;
import com.magdalena.domain.ports.ParcelaRepositoryPort;
import lombok.Builder;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GetParcelaStatsUseCase {

    private final ParcelaRepositoryPort repository;

    public GetParcelaStatsUseCase(ParcelaRepositoryPort repository) {
        this.repository = repository;
    }

    public ParcelaStats execute() {
        List<Parcela> parcelas = repository.findAll();
        
        if (parcelas.isEmpty()) {
            return ParcelaStats.builder()
                    .saludPromedio(0.0)
                    .humedadPromedio(0.0)
                    .phPromedio(0.0)
                    .alertasActivas(0)
                    .build();
        }

        double totalHealth = 0;
        double totalHumidity = 0;
        double totalPh = 0;
        int alerts = 0;

        for (Parcela p : parcelas) {
            totalHealth += (p.getCurrentHealth() != null) ? p.getCurrentHealth() : 0;
            totalHumidity += (p.getCurrentHumidity() != null) ? p.getCurrentHumidity() : 0;
            totalPh += (p.getCurrentPh() != null) ? p.getCurrentPh() : 0;
            
            if ("Inactiva".equalsIgnoreCase(p.getEstado()) || (p.getCurrentHealth() != null && p.getCurrentHealth() < 50)) {
                alerts++;
            }
        }

        return ParcelaStats.builder()
                .saludPromedio(totalHealth / parcelas.size())
                .humedadPromedio(totalHumidity / parcelas.size())
                .phPromedio(totalPh / parcelas.size())
                .alertasActivas(alerts)
                .build();
    }

    @Data
    @Builder
    public static class ParcelaStats {
        private Double saludPromedio;
        private Double humedadPromedio;
        private Double phPromedio;
        private Integer alertasActivas;
    }
}
