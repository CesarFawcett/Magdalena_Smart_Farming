package com.magdalena.domain.events;

import java.util.UUID;

public class ManualReadingEvent extends DomainEvent {
    private final UUID sensorId;
    private final String value;
    private final String sensorName;

    public ManualReadingEvent(UUID sensorId, String sensorName, String value) {
        super(sensorName); // El origen debe ser el nombre del sensor
        this.sensorId = sensorId;
        this.sensorName = sensorName;
        this.value = value;
    }

    public UUID getSensorId() { return sensorId; }
    public String getValue() { return value; }
    public String getSensorName() { return sensorName; }

    @Override
    public String getEventType() {
        return "LECTURA_MANUAL_REGISTRADA";
    }
}
