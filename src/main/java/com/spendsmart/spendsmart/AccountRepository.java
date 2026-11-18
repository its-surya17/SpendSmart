
package com.spendsmart.spendsmart;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {

    // Retrieve accounts belonging to a particular user
    List<Account> findByUser_IdOrderByIdDesc(Long userId);

    // Find an account only if it belongs to that user
    Optional<Account> findByIdAndUser_Id(Long id, Long userId);

    // Check duplicate account names for the same user
    boolean existsByUser_IdAndNameIgnoreCase(Long userId, String name);
}
