
package com.spendsmart.spendsmart;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final SubscriptionRepository repository;
    private final UserRepository userRepository;

    public SubscriptionController(
            SubscriptionRepository repository,
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
    public List<Subscription> getAllSubscriptions(
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        return repository.findByUser_IdOrderByNextPaymentDateAsc(user.getId());
    }

    @PostMapping
    public Subscription createSubscription(
            @RequestBody Subscription subscription,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        validate(subscription);

        // Ownership must come from the authenticated session
        subscription.setId(null);
        subscription.setUser(user);

        return repository.save(subscription);
    }

    @PutMapping("/{id}")
    public Subscription updateSubscription(
            @PathVariable Long id,
            @RequestBody Subscription updated,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Subscription subscription = repository.findByIdAndUser_Id(
                id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Subscription not found"));

        validate(updated);

        subscription.setName(updated.getName());
        subscription.setAmount(updated.getAmount());
        subscription.setBillingCycle(updated.getBillingCycle());
        subscription.setNextPaymentDate(updated.getNextPaymentDate());
        subscription.setActive(updated.isActive());

        return repository.save(subscription);
    }

    @PatchMapping("/{id}/toggle")
    public Subscription toggleSubscription(
            @PathVariable Long id,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Subscription subscription = repository.findByIdAndUser_Id(
                id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Subscription not found"));

        subscription.setActive(!subscription.isActive());

        return repository.save(subscription);
    }

    @DeleteMapping("/{id}")
    public void deleteSubscription(
            @PathVariable Long id,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Subscription subscription = repository.findByIdAndUser_Id(
                id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Subscription not found"));

        repository.delete(subscription);
    }

    private void validate(Subscription subscription) {
        if (subscription.getName() == null
                || subscription.getName().isBlank()
                || subscription.getAmount() == null
                || subscription.getAmount().compareTo(BigDecimal.ZERO) <= 0
                || subscription.getBillingCycle() == null
                || subscription.getNextPaymentDate() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Enter valid subscription details");
        }

        if (!List.of("Monthly", "Yearly", "Weekly")
                .contains(subscription.getBillingCycle())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Billing cycle must be Weekly, Monthly or Yearly");
        }
    }
}
