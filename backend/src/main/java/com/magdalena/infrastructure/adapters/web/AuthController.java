package com.magdalena.infrastructure.adapters.web;

import com.magdalena.application.usecases.LoginUseCase;
import com.magdalena.infrastructure.config.JwtUtils;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final LoginUseCase loginUseCase;
    private final JwtUtils jwtUtils;

    public AuthController(LoginUseCase loginUseCase, JwtUtils jwtUtils) {
        this.loginUseCase = loginUseCase;
        this.jwtUtils = jwtUtils;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        boolean success = loginUseCase.execute(request.getEmail(), request.getPassword());
        if (success) {
            String token = jwtUtils.generateToken(request.getEmail());
            return ResponseEntity.ok().body(new LoginResponse("Login successful", request.getEmail(), "Admin", token));
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
        private String token;

        public LoginResponse(String message, String email, String name, String token) {
            this.message = message;
            this.email = email;
            this.name = name;
            this.token = token;
        }
    }
}
