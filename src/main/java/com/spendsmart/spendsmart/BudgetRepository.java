
package com.spendsmart.spendsmart;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BudgetRepository extends JpaRepository<Budget, Long> {

    // Get budgets belonging to a user for a particular month
    List<Budget> findByUser_IdAndMonthOrderByCategoryAsc(
            Long userId,
            String month
    );

    // Find a category budget belonging to a particular user
    Optional<Budget> findByUser_IdAndCategoryIgnoreCaseAndMonth(
            Long userId,
            String category,
            String month
    );

    // Find a budget by ID only if it belongs to that user
    Optional<Budget> findByIdAndUser_Id(
            Long id,
            Long userId
    );

    // Check whether a user already has this category budget
    boolean existsByUser_IdAndCategoryIgnoreCaseAndMonth(
            Long userId,
            String category,
            String month
    );
}
