package com.magdalena.infrastructure.adapters.messaging;

import com.magdalena.domain.events.DomainEvent;
import com.magdalena.domain.ports.EventPublisherPort;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class RabbitMQEventPublisherAdapter implements EventPublisherPort {

    private final RabbitTemplate rabbitTemplate;
    private static final String EXCHANGE_NAME = "magdalena.events";

    public RabbitMQEventPublisherAdapter(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @Override
    public void publish(DomainEvent event) {
        rabbitTemplate.convertAndSend(EXCHANGE_NAME, event.getEventType(), event);
        System.out.println("Published event: " + event.getEventType());
    }
}
