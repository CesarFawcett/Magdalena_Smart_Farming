package com.magdalena.domain.events;

public class UserLoggedInEvent extends DomainEvent {
    private final String email;

    public UserLoggedInEvent(String email) {
        super();
        this.email = email;
    }

    public String getEmail() {
        return email;
    }

    @Override
    public String getEventType() {
        return "USER_LOGGED_IN";
    }
}
