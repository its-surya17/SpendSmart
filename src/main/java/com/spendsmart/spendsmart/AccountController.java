
package com.spendsmart.spendsmart;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public AccountController(
            AccountRepository accountRepository,
            UserRepository userRepository) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
    }

    // Get the currently logged-in user
    private User getCurrentUser(Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Please log in");
        }

        return userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "User not found"));
    }

    // Validate account details
    private void validateAccount(Account account) {

        if (account.getName() == null || account.getName().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Account name is required");
        }

        if (account.getAccountType() == null
                || account.getAccountType().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Account type is required");
        }

        if (account.getOpeningBalance() == null
                || account.getOpeningBalance().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Opening balance cannot be negative");
        }
    }

    // Get all accounts belonging to the logged-in user
    @GetMapping
    public List<Account> getAllAccounts(Authentication authentication) {

        User user = getCurrentUser(authentication);

        return accountRepository.findByUser_IdOrderByIdDesc(user.getId());
    }

    // Create an account
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Account createAccount(
            @RequestBody Account account,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        validateAccount(account);

        if (accountRepository.existsByUser_IdAndNameIgnoreCase(
                user.getId(), account.getName().trim())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An account with this name already exists");
        }

        account.setId(null);
        account.setName(account.getName().trim());
        account.setUser(user);

        return accountRepository.save(account);
    }

    // Update only an account owned by the logged-in user
    @PutMapping("/{id}")
    public Account updateAccount(
            @PathVariable Long id,
            @RequestBody Account updatedAccount,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Account account = accountRepository
                .findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Account not found"));

        validateAccount(updatedAccount);

        String newName = updatedAccount.getName().trim();

        boolean duplicateName = accountRepository
                .existsByUser_IdAndNameIgnoreCase(user.getId(), newName);

        if (duplicateName && !account.getName().equalsIgnoreCase(newName)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An account with this name already exists");
        }

        account.setName(newName);
        account.setAccountType(updatedAccount.getAccountType());
        account.setInstitution(updatedAccount.getInstitution());
        account.setOpeningBalance(updatedAccount.getOpeningBalance());
        account.setDescription(updatedAccount.getDescription());

        return accountRepository.save(account);
    }

    // Delete only an account owned by the logged-in user
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(
            @PathVariable Long id,
            Authentication authentication) {

        User user = getCurrentUser(authentication);

        Account account = accountRepository
                .findByIdAndUser_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Account not found"));

        accountRepository.delete(account);
    }
}
