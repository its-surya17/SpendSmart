
package com.spendsmart.spendsmart;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/bills")
public class BillController {

    private final BillRepository repository;
    private final UserRepository userRepository;

    public BillController(
            BillRepository repository,
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
    public List<Bill> getAllBills(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return repository.findByUser_IdOrderByDueDateAsc(user.getId());
    }

    @PostMapping
    public Bill createBill(
            @RequestBody Bill bill,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        validateBill(bill);

        if (bill.getStatus() == null || bill.getStatus().isBlank()) {
            bill.setStatus("Pending");
        }

        validateStatus(bill.getStatus());

        // Never accept ownership from the frontend
        bill.setId(null);
        bill.setUser(user);

        return repository.save(bill);
    }

    @PutMapping("/{id}")
    public Bill updateBill(
            @PathVariable Long id,
            @RequestBody Bill updated,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Bill bill = repository.findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Bill not found"));

        validateBill(updated);

        bill.setTitle(updated.getTitle());
        bill.setCategory(updated.getCategory());
        bill.setAmount(updated.getAmount());
        bill.setDueDate(updated.getDueDate());

        if (updated.getStatus() != null && !updated.getStatus().isBlank()) {
            validateStatus(updated.getStatus());
            bill.setStatus(updated.getStatus());
        }

        return repository.save(bill);
    }

    @PatchMapping("/{id}/pay")
    public Bill markAsPaid(
            @PathVariable Long id,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Bill bill = repository.findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Bill not found"));

        bill.setStatus("Paid");
        return repository.save(bill);
    }

    @DeleteMapping("/{id}")
    public void deleteBill(
            @PathVariable Long id,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Bill bill = repository.findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Bill not found"));

        repository.delete(bill);
    }

    private void validateBill(Bill bill) {
        if (bill.getTitle() == null || bill.getTitle().isBlank()
                || bill.getCategory() == null || bill.getCategory().isBlank()
                || bill.getAmount() == null
                || bill.getAmount().compareTo(BigDecimal.ZERO) <= 0
                || bill.getDueDate() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Enter valid bill details");
        }
    }

    private void validateStatus(String status) {
        if (!status.equalsIgnoreCase("Pending")
                && !status.equalsIgnoreCase("Paid")) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Status must be Pending or Paid");
        }
    }
}
