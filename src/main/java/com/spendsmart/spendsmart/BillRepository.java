
package com.spendsmart.spendsmart;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long> {

    // Retrieve bills belonging to a particular user
    List<Bill> findByUser_IdOrderByDueDateAsc(Long userId);

    // Find a bill only if it belongs to that user
    Optional<Bill> findByIdAndUser_Id(Long id, Long userId);
}
