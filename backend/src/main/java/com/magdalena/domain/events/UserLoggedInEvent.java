package com.magdalena.domain.events;

public class UserLoggedInEvent extends DomainEvent {
    private final String email;

    public UserLoggedInEvent(String email) {
        this(email, "Auth Service");
    }

    public UserLoggedInEvent(String email, String origin) {
        super(origin);
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
