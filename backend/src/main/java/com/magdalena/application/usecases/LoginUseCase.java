package com.magdalena.application.usecases;

import com.magdalena.domain.events.UserLoggedInEvent;
import com.magdalena.domain.ports.EventPublisherPort;
import com.magdalena.domain.ports.EventStorePort;
import org.springframework.stereotype.Service;

@Service
public class LoginUseCase {

    private final EventStorePort eventStore;
    private final EventPublisherPort eventPublisher;

    public LoginUseCase(EventStorePort eventStore, EventPublisherPort eventPublisher) {
        this.eventStore = eventStore;
        this.eventPublisher = eventPublisher;
    }

    public boolean execute(String email, String password) {
        // Hardcoded admin check as requested
        if ("Admin@gmail.com".equalsIgnoreCase(email) && "Admin123".equals(password)) {
            UserLoggedInEvent event = new UserLoggedInEvent(email);
            
            // Event Sourcing Flow:
            // 1. Save to Event Store (PostgreSQL)
            eventStore.save(event);
            
            // 2. Publish to Broker (RabbitMQ)
            eventPublisher.publish(event);
            
            return true;
        }
        return false;
    }
}
