package com.example.moneymanager.controller;

import com.example.moneymanager.dto.ApiResponse;
import com.example.moneymanager.dto.LoginRequest;
import com.example.moneymanager.dto.UserDTO;
import com.example.moneymanager.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            // Check if the username is empty
            if (loginRequest.getUsername() == null || loginRequest.getUsername().trim().isEmpty()) {
                return new ResponseEntity<>(
                    new ApiResponse(false, "Username cannot be empty"),
                    HttpStatus.BAD_REQUEST
                );
            }
            
            // Check if the password is empty
            if (loginRequest.getPassword() == null || loginRequest.getPassword().trim().isEmpty()) {
                return new ResponseEntity<>(
                    new ApiResponse(false, "Password cannot be empty"),
                    HttpStatus.BAD_REQUEST
                );
            }

            // Find user by username
            UserDTO user = userService.getUserByUsername(loginRequest.getUsername());
            
            if (user == null) {
                return new ResponseEntity<>(
                    new ApiResponse(false, "Invalid username or password"),
                    HttpStatus.UNAUTHORIZED
                );
            }

            // Check if password matches
            if (!loginRequest.getPassword().equals(user.getPassword())) {
                return new ResponseEntity<>(
                    new ApiResponse(false, "Invalid username or password"),
                    HttpStatus.UNAUTHORIZED
                );
            }

            // Return user data without password
            user.setPassword(null); // Don't send password back to client
            return new ResponseEntity<>(user, HttpStatus.OK);
            
        } catch (Exception e) {
            return new ResponseEntity<>(
                new ApiResponse(false, "Login failed: " + e.getMessage()),
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}