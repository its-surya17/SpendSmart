
package com.spendsmart.spendsmart;

import java.util.List;
import java.util.ArrayList;
import java.math.BigDecimal;
import java.time.LocalDate;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseRepository repository;
    private final UserRepository userRepository;

    public ExpenseController(
            ExpenseRepository repository,
            UserRepository userRepository) {
        this.repository = repository;
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

    // Get transactions belonging only to the logged-in user
    @GetMapping
    public List<Expense> getAllExpenses(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate endDate,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        if (startDate != null && endDate != null
                && startDate.isAfter(endDate)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Start date cannot be after end date"
            );
        }

        if (type != null && type.isBlank()) {
            type = null;
        }

        if (category != null && category.isBlank()) {
            category = null;
        }

        if (type != null
                && !(type.equalsIgnoreCase("INCOME")
                || type.equalsIgnoreCase("EXPENSE"))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Type must be INCOME or EXPENSE"
            );
        }

        return repository.filterExpenses(
                user.getId(),
                type,
                category,
                startDate,
                endDate
        );
    }

    // Get financial summary for the logged-in user
    @GetMapping("/summary")
    public ExpenseSummary getExpenseSummary(
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        BigDecimal totalIncome =
                repository.getTotalIncome(user.getId());

        BigDecimal totalExpenses =
                repository.getTotalExpenses(user.getId());

        if (totalIncome == null) {
            totalIncome = BigDecimal.ZERO;
        }

        if (totalExpenses == null) {
            totalExpenses = BigDecimal.ZERO;
        }

        BigDecimal balance = totalIncome.subtract(totalExpenses);

        return new ExpenseSummary(
                totalIncome,
                totalExpenses,
                balance
        );
    }

    // Add a transaction for the logged-in user
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Expense addExpense(
            @RequestBody Expense expense,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        validateExpense(expense);

        expense.setId(null);
        expense.setType(expense.getType().toUpperCase());
        expense.setUser(user);

        return repository.save(expense);
    }

    // Update only a transaction owned by the logged-in user
    @PutMapping("/{id}")
    public Expense updateExpense(
            @PathVariable Long id,
            @RequestBody Expense updatedExpense,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Expense existingExpense =
                repository.findByIdAndUser_Id(id, user.getId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Transaction not found"
                        ));

        validateExpense(updatedExpense);

        existingExpense.setAmount(updatedExpense.getAmount());
        existingExpense.setCategory(updatedExpense.getCategory());
        existingExpense.setType(updatedExpense.getType().toUpperCase());
        existingExpense.setDescription(updatedExpense.getDescription());
        existingExpense.setDate(updatedExpense.getDate());

        return repository.save(existingExpense);
    }

    // Delete only a transaction owned by the logged-in user
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteExpense(
            @PathVariable Long id,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Expense existingExpense =
                repository.findByIdAndUser_Id(id, user.getId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Transaction not found"
                        ));

        repository.delete(existingExpense);
    }

    // Validate transaction details
    private void validateExpense(Expense expense) {

        if (expense.getAmount() == null
                || expense.getAmount().signum() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Amount must be greater than zero"
            );
        }

        if (expense.getCategory() == null
                || expense.getCategory().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Category is required"
            );
        }

        if (expense.getType() == null
                || !(expense.getType().equalsIgnoreCase("INCOME")
                || expense.getType().equalsIgnoreCase("EXPENSE"))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Type must be INCOME or EXPENSE"
            );
        }
    }

    // Monthly financial analytics for the logged-in user
    @GetMapping("/monthly-summary")
    public List<MonthlySummary> getMonthlySummary(
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        List<Object[]> results =
                repository.getMonthlySummary(user.getId());

        List<MonthlySummary> monthlySummaries = new ArrayList<>();

        for (Object[] row : results) {

            String month = row[0].toString();

            BigDecimal income = row[1] == null
                    ? BigDecimal.ZERO
                    : new BigDecimal(row[1].toString());

            BigDecimal expenses = row[2] == null
                    ? BigDecimal.ZERO
                    : new BigDecimal(row[2].toString());

            monthlySummaries.add(
                    new MonthlySummary(month, income, expenses)
            );
        }

        return monthlySummaries;
    }

    // Category-wise spending analytics for the logged-in user
    @GetMapping("/category-summary")
    public List<CategorySummary> getCategorySummary(
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        List<Object[]> results =
                repository.getCategorySummary(user.getId());

        List<CategorySummary> summaries = new ArrayList<>();

        for (Object[] row : results) {

            String category = row[0].toString();

            BigDecimal total =
                    new BigDecimal(row[1].toString());

            summaries.add(
                    new CategorySummary(category, total)
            );
        }

        return summaries;
    }
}
