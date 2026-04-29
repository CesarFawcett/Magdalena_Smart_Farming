package com.magdalena.infrastructure.adapters.web;

import com.magdalena.application.usecases.LoginUseCase;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*") // Enabled CORS for frontend
public class AuthController {

    private final LoginUseCase loginUseCase;

    public AuthController(LoginUseCase loginUseCase) {
        this.loginUseCase = loginUseCase;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        boolean success = loginUseCase.execute(request.getEmail(), request.getPassword());
        if (success) {
            return ResponseEntity.ok().body(new LoginResponse("Login successful", request.getEmail(), "Admin"));
        } else {
            return ResponseEntity.status(401).body("Invalid credentials");
        }
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Data
    public static class LoginResponse {
        private String message;
        private String email;
        private String name;

        public LoginResponse(String message, String email, String name) {
            this.message = message;
            this.email = email;
            this.name = name;
        }
    }
}
