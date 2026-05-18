package com.magdalena.domain.events;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoredEvent {
    private Long id;
    private UUID eventId;
    private String eventType;
    private String payload;
    private LocalDateTime occurredOn;
    private String origin;
}
