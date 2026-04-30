package com.magdalena.infrastructure.adapters.web;

import com.magdalena.application.usecases.CreateParcelaUseCase;
import com.magdalena.application.usecases.DeleteParcelaUseCase;
import com.magdalena.application.usecases.GetParcelaStatsUseCase;
import com.magdalena.application.usecases.GetParcelasUseCase;
import com.magdalena.domain.model.Parcela;
import com.magdalena.infrastructure.adapters.persistence.ParcelaEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/parcelas")
@CrossOrigin(origins = "*")
public class ParcelaController {

    private final CreateParcelaUseCase createParcelaUseCase;
    private final GetParcelasUseCase getParcelasUseCase;
    private final GetParcelaStatsUseCase getParcelaStatsUseCase;
    private final DeleteParcelaUseCase deleteParcelaUseCase;

    public ParcelaController(CreateParcelaUseCase createParcelaUseCase, 
                             GetParcelasUseCase getParcelasUseCase,
                             GetParcelaStatsUseCase getParcelaStatsUseCase,
                             DeleteParcelaUseCase deleteParcelaUseCase) {
        this.createParcelaUseCase = createParcelaUseCase;
        this.getParcelasUseCase = getParcelasUseCase;
        this.getParcelaStatsUseCase = getParcelaStatsUseCase;
        this.deleteParcelaUseCase = deleteParcelaUseCase;
    }

    @PostMapping
    public ResponseEntity<Parcela> create(@RequestBody Parcela parcela) {
        return ResponseEntity.ok(createParcelaUseCase.execute(parcela));
    }

    @GetMapping
    public ResponseEntity<List<ParcelaEntity>> getAll() {
        return ResponseEntity.ok(getParcelasUseCase.execute());
    }

    @GetMapping("/stats")
    public ResponseEntity<GetParcelaStatsUseCase.ParcelaStats> getStats() {
        return ResponseEntity.ok(getParcelaStatsUseCase.execute());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        deleteParcelaUseCase.execute(id);
        return ResponseEntity.noContent().build();
    }
}
