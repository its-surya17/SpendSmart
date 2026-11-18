
package com.spendsmart.spendsmart;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    public BudgetController(
            BudgetRepository budgetRepository,
            ExpenseRepository expenseRepository,
            UserRepository userRepository) {

        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
    }

    // Get the currently logged-in user
    private User getCurrentUser(Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in"
            );
        }

        return userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "User not found"
                ));
    }

    // GET: Retrieve budgets for a month
    @GetMapping
    public List<Budget> getBudgets(
            @RequestParam(required = false) String month,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        String selectedMonth = getValidMonth(month);

        return budgetRepository
                .findByUser_IdAndMonthOrderByCategoryAsc(
                        user.getId(),
                        selectedMonth
                );
    }

    // POST: Create or update a budget
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Budget saveBudget(
            @RequestBody Budget budget,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        if (budget.getCategory() == null
                || budget.getCategory().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Category is required"
            );
        }

        if (budget.getAmount() == null
                || budget.getAmount().compareTo(BigDecimal.ZERO) <= 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Budget amount must be greater than zero"
            );
        }

        String category = budget.getCategory().trim();
        String month = getValidMonth(budget.getMonth());

        Budget existingBudget = budgetRepository
                .findByUser_IdAndCategoryIgnoreCaseAndMonth(
                        user.getId(),
                        category,
                        month
                )
                .orElse(new Budget());

        existingBudget.setCategory(category);
        existingBudget.setAmount(budget.getAmount());
        existingBudget.setMonth(month);

        // Assign ownership on every new budget
        existingBudget.setUser(user);

        return budgetRepository.save(existingBudget);
    }

    // GET: Calculate spending and remaining budget
    @GetMapping("/summary")
    public List<BudgetSummary> getBudgetSummary(
            @RequestParam(required = false) String month,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        String selectedMonth = getValidMonth(month);

        List<Budget> budgets = budgetRepository
                .findByUser_IdAndMonthOrderByCategoryAsc(
                        user.getId(),
                        selectedMonth
                );

        YearMonth yearMonth = YearMonth.parse(selectedMonth);

        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        // Only retrieve this user's expenses
        List<Expense> expenses = expenseRepository
                .findByUser_IdAndDateBetween(
                        user.getId(),
                        startDate,
                        endDate
                );

        return budgets.stream().map(budget -> {

            BigDecimal spent = expenses.stream()
                    .filter(expense ->
                            "EXPENSE".equalsIgnoreCase(
                                    expense.getType()))
                    .filter(expense -> {

                        if ("Overall".equalsIgnoreCase(
                                budget.getCategory())) {
                            return true;
                        }

                        return expense.getCategory() != null
                                && expense.getCategory().equalsIgnoreCase(
                                        budget.getCategory());
                    })
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            return new BudgetSummary(
                    budget.getId(),
                    budget.getCategory(),
                    budget.getAmount(),
                    spent
            );

        }).toList();
    }

    // DELETE: Remove only the logged-in user's budget
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBudget(
            @PathVariable Long id,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Budget existingBudget = budgetRepository
                .findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Budget not found"
                ));

        budgetRepository.delete(existingBudget);
    }

    // Validate and select month
    private String getValidMonth(String month) {

        try {
            if (month == null || month.isBlank()) {
                return YearMonth.now().toString();
            }

            return YearMonth.parse(month).toString();

        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Month must be in YYYY-MM format"
            );
        }
    }
}
