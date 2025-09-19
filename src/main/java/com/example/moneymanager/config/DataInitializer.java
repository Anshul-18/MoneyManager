package com.example.moneymanager.config;

import com.example.moneymanager.model.User;
import com.example.moneymanager.repository.UserRepository;
import com.example.moneymanager.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * This class initializes sample data for the Money Manager application
 * but only if the database is empty (no users exist).
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    @Autowired
    public DataInitializer(UserRepository userRepository, TransactionRepository transactionRepository) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
    }

    @Override
    public void run(String... args) {
        try {
            // Check if there are any users
            if (userRepository.count() == 0) {
                createDefaultUsers();
            }
        } catch (Exception e) {
            System.err.println("Error initializing data: " + e.getMessage());
        }
    }

    private void createDefaultUsers() {
        System.out.println("Creating default users...");

        // Create admin user
        User admin = new User();
        admin.setUsername("admin");
        admin.setEmail("admin@moneymanager.com");
        admin.setPassword("admin123");
        userRepository.save(admin);

        // Create sample user
        User john = new User();
        john.setUsername("john_doe");
        john.setEmail("john@example.com");
        john.setPassword("password123");
        userRepository.save(john);

        System.out.println("Default users created successfully");
    }
}