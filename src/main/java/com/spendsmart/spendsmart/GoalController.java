
package com.spendsmart.spendsmart;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalRepository repository;
    private final UserRepository userRepository;

    public GoalController(
            GoalRepository repository,
            UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Please log in");
        }

        return userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "User not found"));
    }

    @GetMapping
    public List<Goal> getGoals(Authentication authentication) {
        User user = getCurrentUser(authentication);

        return repository.findByUser_IdOrderByTargetDateAsc(user.getId());
    }

    @PostMapping
    public Goal createGoal(
            @RequestBody Goal goal,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        validate(goal);

        if (goal.getSavedAmount() == null) {
            goal.setSavedAmount(BigDecimal.ZERO);
        }

        validateSavedAmount(goal.getSavedAmount(), goal.getTargetAmount());

        // Assign ownership from the authenticated user
        goal.setId(null);
        goal.setUser(user);

        return repository.save(goal);
    }

    @PutMapping("/{id}")
    public Goal updateGoal(
            @PathVariable Long id,
            @RequestBody Goal updated,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Goal goal = repository.findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Goal not found"));

        validate(updated);

        if (updated.getSavedAmount() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid saved amount");
        }

        validateSavedAmount(
                updated.getSavedAmount(), updated.getTargetAmount());

        goal.setName(updated.getName());
        goal.setTargetAmount(updated.getTargetAmount());
        goal.setSavedAmount(updated.getSavedAmount());
        goal.setTargetDate(updated.getTargetDate());

        return repository.save(goal);
    }

    @PatchMapping("/{id}/add-savings")
    public Goal addSavings(
            @PathVariable Long id,
            @RequestParam BigDecimal amount,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Goal goal = repository.findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Goal not found"));

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Amount must be positive");
        }

        BigDecimal updated = goal.getSavedAmount().add(amount);

        if (updated.compareTo(goal.getTargetAmount()) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Savings cannot exceed target");
        }

        goal.setSavedAmount(updated);

        return repository.save(goal);
    }

    @DeleteMapping("/{id}")
    public void deleteGoal(
            @PathVariable Long id,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Goal goal = repository.findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Goal not found"));

        repository.delete(goal);
    }

    private void validate(Goal goal) {
        if (goal.getName() == null || goal.getName().isBlank()
                || goal.getTargetAmount() == null
                || goal.getTargetAmount().compareTo(BigDecimal.ZERO) <= 0
                || goal.getTargetDate() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Enter valid goal details");
        }
    }

    private void validateSavedAmount(
            BigDecimal savedAmount, BigDecimal targetAmount) {

        if (savedAmount.compareTo(BigDecimal.ZERO) < 0
                || savedAmount.compareTo(targetAmount) > 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid saved amount");
        }
    }
}
