package com.example.moneymanager.controller;

import com.example.moneymanager.dto.TransactionDTO;
import com.example.moneymanager.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<TransactionDTO>> getAllTransactionsByUserId(@PathVariable Long userId) {
        List<TransactionDTO> transactions = transactionService.getAllTransactionsByUserId(userId);
        return new ResponseEntity<>(transactions, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionDTO> getTransactionById(@PathVariable Long id) {
        TransactionDTO transaction = transactionService.getTransactionById(id);
        if (transaction == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        return new ResponseEntity<>(transaction, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/type/{type}")
    public ResponseEntity<List<TransactionDTO>> getTransactionsByType(
            @PathVariable Long userId, @PathVariable String type) {
        List<TransactionDTO> transactions = transactionService.getTransactionsByType(userId, type);
        return new ResponseEntity<>(transactions, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/category/{category}")
    public ResponseEntity<List<TransactionDTO>> getTransactionsByCategory(
            @PathVariable Long userId, @PathVariable String category) {
        List<TransactionDTO> transactions = transactionService.getTransactionsByCategory(userId, category);
        return new ResponseEntity<>(transactions, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/daterange")
    public ResponseEntity<List<TransactionDTO>> getTransactionsByDateRange(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<TransactionDTO> transactions = transactionService.getTransactionsByDateRange(userId, start, end);
        return new ResponseEntity<>(transactions, HttpStatus.OK);
    }

    @GetMapping("/user/{userId}/summary")
    public ResponseEntity<Map<String, Double>> getFinancialSummary(@PathVariable Long userId) {
        Map<String, Double> summary = new HashMap<>();
        summary.put("balance", transactionService.calculateBalance(userId));
        summary.put("income", transactionService.calculateIncomeTotal(userId));
        summary.put("expense", transactionService.calculateExpenseTotal(userId));
        return new ResponseEntity<>(summary, HttpStatus.OK);
    }

    @PostMapping
    public ResponseEntity<TransactionDTO> createTransaction(@Valid @RequestBody TransactionDTO transactionDTO) {
        TransactionDTO createdTransaction = transactionService.createTransaction(transactionDTO);
        if (createdTransaction == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        return new ResponseEntity<>(createdTransaction, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionDTO> updateTransaction(
            @PathVariable Long id, @Valid @RequestBody TransactionDTO transactionDTO) {
        TransactionDTO updatedTransaction = transactionService.updateTransaction(id, transactionDTO);
        if (updatedTransaction == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        return new ResponseEntity<>(updatedTransaction, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {
        boolean deleted = transactionService.deleteTransaction(id);
        if (!deleted) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}