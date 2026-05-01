package com.magdalena.infrastructure.adapters.web;

import com.magdalena.application.usecases.GetEventHistoryUseCase;
import com.magdalena.infrastructure.adapters.persistence.EventStoreEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "*")
public class EventController {

    private final GetEventHistoryUseCase getEventHistoryUseCase;
    private final com.magdalena.domain.ports.EventStorePort eventStore;

    public EventController(GetEventHistoryUseCase getEventHistoryUseCase, 
                           com.magdalena.domain.ports.EventStorePort eventStore) {
        this.getEventHistoryUseCase = getEventHistoryUseCase;
        this.eventStore = eventStore;
    }

    @GetMapping
    public ResponseEntity<List<EventStoreEntity>> getHistory() {
        System.out.println("🔍 Consultando historial de eventos...");
        return ResponseEntity.ok(getEventHistoryUseCase.execute());
    }

    @PostMapping("/clear")
    @Transactional
    public ResponseEntity<Void> deleteHistory() {
        System.out.println("🗑️ Petición de borrado de historial recibida (via POST)...");
        eventStore.deleteAll();
        return ResponseEntity.ok().build();
    }
}
