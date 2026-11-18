package com.spendsmart.spendsmart;

import java.util.Map;
import java.util.regex.Pattern;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    private final HttpSessionSecurityContextRepository contextRepository =
            new HttpSessionSecurityContextRepository();

    public AuthController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    // Provides a CSRF token to the frontend.
    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of("token", csrfToken.getToken());
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody RegisterRequest request) {

        if (request.getName() == null ||
                request.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Name is required"));
        }

        if (request.getEmail() == null ||
                !Pattern.matches(
                    "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                    request.getEmail().trim())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Enter a valid email"));
        }

        if (request.getPassword() == null ||
                request.getPassword().length() < 8) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                        "message",
                        "Password must contain at least 8 characters"
                    ));
        }

        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                        "message",
                        "Email is already registered"
                    ));
        }

        User user = new User(
                request.getName().trim(),
                email,
                passwordEncoder.encode(request.getPassword())
        );

        userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                    "message", "Registration successful",
                    "email", user.getEmail(),
                    "name", user.getName()
                ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        try {
            Authentication authentication =
                    authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(
                            request.getEmail().trim().toLowerCase(),
                            request.getPassword()
                        )
                    );

            SecurityContext context =
                    SecurityContextHolder.createEmptyContext();

            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            contextRepository.saveContext(
                    context, httpRequest, httpResponse);

            User user = userRepository
                    .findByEmailIgnoreCase(authentication.getName())
                    .orElseThrow();

            return ResponseEntity.ok(Map.of(
                    "message", "Login successful",
                    "name", user.getName(),
                    "email", user.getEmail()
            ));

        } catch (Exception exception) {
            SecurityContextHolder.clearContext();

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                        "message", "Invalid email or password"
                    ));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response) {

        new SecurityContextLogoutHandler()
                .logout(request, response, authentication);

        return ResponseEntity.ok(
                Map.of("message", "Logout successful"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> currentUser(
            Authentication authentication) {

        User user = userRepository
                .findByEmailIgnoreCase(authentication.getName())
                .orElseThrow();

        return ResponseEntity.ok(Map.of(
                "name", user.getName(),
                "email", user.getEmail()
        ));
    }


@PostMapping("/change-password")
public ResponseEntity<?> changePassword(
        @RequestBody PasswordChangeRequest request,
        Authentication authentication) {

    if (request.getCurrentPassword() == null ||
            request.getCurrentPassword().isBlank()) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "Current password is required"));
    }

    if (request.getNewPassword() == null ||
            request.getNewPassword().length() < 8) {
        return ResponseEntity.badRequest()
                .body(Map.of("message",
                        "New password must contain at least 8 characters"));
    }

    User user = userRepository
            .findByEmailIgnoreCase(authentication.getName())
            .orElseThrow();

    if (!passwordEncoder.matches(
            request.getCurrentPassword(), user.getPasswordHash())) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Current password is incorrect"));
    }

    if (passwordEncoder.matches(
            request.getNewPassword(), user.getPasswordHash())) {
        return ResponseEntity.badRequest()
                .body(Map.of("message",
                        "New password must be different from current password"));
    }

    user.setPasswordHash(
            passwordEncoder.encode(request.getNewPassword()));

    userRepository.save(user);

    return ResponseEntity.ok(
            Map.of("message", "Password changed successfully"));
}

}