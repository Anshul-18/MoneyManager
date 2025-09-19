package com.example.moneymanager.service;

import com.example.moneymanager.dto.TransactionDTO;
import com.example.moneymanager.model.Transaction;
import com.example.moneymanager.model.User;
import com.example.moneymanager.repository.TransactionRepository;
import com.example.moneymanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserRepository userRepository;

    public List<TransactionDTO> getAllTransactionsByUserId(Long userId) {
        List<Transaction> transactions = transactionRepository.findByUserIdOrderByDateDesc(userId);
        return transactions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public TransactionDTO getTransactionById(Long id) {
        Optional<Transaction> transaction = transactionRepository.findById(id);
        return transaction.map(this::convertToDTO).orElse(null);
    }

    public List<TransactionDTO> getTransactionsByType(Long userId, String type) {
        List<Transaction> transactions = transactionRepository.findByUserIdAndTypeLikeOrderByDateDesc(userId, type);
        return transactions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<TransactionDTO> getTransactionsByDateRange(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        List<Transaction> transactions = transactionRepository.findByUserIdAndDateBetweenOrderByDateDesc(userId, startDate, endDate);
        return transactions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<TransactionDTO> getTransactionsByCategory(Long userId, String category) {
        List<Transaction> transactions = transactionRepository.findByUserIdAndCategoryOrderByDateDesc(userId, category);
        return transactions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public TransactionDTO createTransaction(TransactionDTO transactionDTO) {
        Optional<User> userOptional = userRepository.findById(transactionDTO.getUserId());
        
        if (userOptional.isEmpty()) {
            return null; // User not found
        }

        Transaction transaction = convertToEntity(transactionDTO, userOptional.get());
        
        // Set date if not provided
        if (transaction.getDate() == null) {
            transaction.setDate(LocalDateTime.now());
        }
        
        Transaction savedTransaction = transactionRepository.save(transaction);
        return convertToDTO(savedTransaction);
    }

    public TransactionDTO updateTransaction(Long id, TransactionDTO transactionDTO) {
        if (!transactionRepository.existsById(id)) {
            return null;
        }
        
        Optional<User> userOptional = userRepository.findById(transactionDTO.getUserId());
        
        if (userOptional.isEmpty()) {
            return null; // User not found
        }
        
        Transaction transaction = convertToEntity(transactionDTO, userOptional.get());
        transaction.setId(id);
        Transaction updatedTransaction = transactionRepository.save(transaction);
        return convertToDTO(updatedTransaction);
    }

    public boolean deleteTransaction(Long id) {
        if (!transactionRepository.existsById(id)) {
            return false;
        }
        
        transactionRepository.deleteById(id);
        return true;
    }

    public Double calculateBalance(Long userId) {
        List<Transaction> transactions = transactionRepository.findByUserIdOrderByDateDesc(userId);
        return transactions.stream()
                .mapToDouble(transaction -> 
                    "INCOME".equals(transaction.getType()) ? transaction.getAmount() : -transaction.getAmount())
                .sum();
    }

    public Double calculateIncomeTotal(Long userId) {
        List<Transaction> transactions = transactionRepository.findByUserIdAndTypeLikeOrderByDateDesc(userId, "INCOME");
        return transactions.stream()
                .mapToDouble(Transaction::getAmount)
                .sum();
    }

    public Double calculateExpenseTotal(Long userId) {
        List<Transaction> transactions = transactionRepository.findByUserIdAndTypeLikeOrderByDateDesc(userId, "EXPENSE");
        return transactions.stream()
                .mapToDouble(Transaction::getAmount)
                .sum();
    }

    private TransactionDTO convertToDTO(Transaction transaction) {
        TransactionDTO dto = new TransactionDTO();
        dto.setId(transaction.getId());
        dto.setType(transaction.getType());
        dto.setAmount(transaction.getAmount());
        dto.setDescription(transaction.getDescription());
        dto.setDate(transaction.getDate());
        dto.setCategory(transaction.getCategory());
        dto.setUserId(transaction.getUser().getId());
        return dto;
    }

    private Transaction convertToEntity(TransactionDTO dto, User user) {
        Transaction transaction = new Transaction();
        transaction.setId(dto.getId());
        transaction.setType(dto.getType());
        transaction.setAmount(dto.getAmount());
        transaction.setDescription(dto.getDescription());
        transaction.setDate(dto.getDate());
        transaction.setCategory(dto.getCategory());
        transaction.setUser(user);
        return transaction;
    }
}