package com.example.moneymanager.repository;

import com.example.moneymanager.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserIdOrderByDateDesc(Long userId);
    List<Transaction> findByUserIdAndTypeLikeOrderByDateDesc(Long userId, String type);
    List<Transaction> findByUserIdAndDateBetweenOrderByDateDesc(Long userId, LocalDateTime startDate, LocalDateTime endDate);
    List<Transaction> findByUserIdAndCategoryOrderByDateDesc(Long userId, String category);
}