package com.magdalena.infrastructure.adapters.web;

import com.magdalena.application.usecases.GetEventHistoryUseCase;
import com.magdalena.infrastructure.adapters.persistence.EventStoreEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "*")
public class EventController {

    private final GetEventHistoryUseCase getEventHistoryUseCase;

    public EventController(GetEventHistoryUseCase getEventHistoryUseCase) {
        this.getEventHistoryUseCase = getEventHistoryUseCase;
    }

    @GetMapping
    public ResponseEntity<List<EventStoreEntity>> getHistory() {
        return ResponseEntity.ok(getEventHistoryUseCase.execute());
    }
}
