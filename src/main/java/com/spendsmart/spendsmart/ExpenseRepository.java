
package com.spendsmart.spendsmart;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findAllByUser_IdOrderByDateDesc(Long userId);

    Optional<Expense> findByIdAndUser_Id(Long id, Long userId);

    @Query("""
        SELECT SUM(e.amount) FROM Expense e
        WHERE e.type = 'INCOME'
        AND e.user.id = :userId
        """)
    BigDecimal getTotalIncome(@Param("userId") Long userId);

    @Query("""
        SELECT SUM(e.amount) FROM Expense e
        WHERE e.type = 'EXPENSE'
        AND e.user.id = :userId
        """)
    BigDecimal getTotalExpenses(@Param("userId") Long userId);

    List<Expense> findByUser_IdAndTypeIgnoreCase(Long userId, String type);

    List<Expense> findByUser_IdAndCategoryIgnoreCase(Long userId, String category);

    List<Expense> findByUser_IdAndDateBetween(
            Long userId, LocalDate startDate, LocalDate endDate);

    @Query("""
        SELECT e FROM Expense e
        WHERE e.user.id = :userId
        AND (:type IS NULL OR LOWER(e.type) = LOWER(:type))
        AND (:category IS NULL OR LOWER(e.category) = LOWER(:category))
        AND (:startDate IS NULL OR e.date >= :startDate)
        AND (:endDate IS NULL OR e.date <= :endDate)
        ORDER BY e.date DESC
        """)
    List<Expense> filterExpenses(
            @Param("userId") Long userId,
            @Param("type") String type,
            @Param("category") String category,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query(value = """
        SELECT
            DATE_FORMAT(date, '%Y-%m') AS month,
            SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS expenses
        FROM expenses
        WHERE user_id = :userId
        AND date >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
        GROUP BY DATE_FORMAT(date, '%Y-%m')
        ORDER BY month ASC
        """, nativeQuery = true)
    List<Object[]> getMonthlySummary(@Param("userId") Long userId);

    @Query(value = """
        SELECT category, SUM(amount) AS total
        FROM expenses
        WHERE user_id = :userId
        AND type = 'EXPENSE'
        GROUP BY category
        ORDER BY total DESC
        """, nativeQuery = true)
    List<Object[]> getCategorySummary(@Param("userId") Long userId);
}
