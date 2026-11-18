
package com.spendsmart.spendsmart;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GoalRepository extends JpaRepository<Goal, Long> {

    // Retrieve goals belonging to a particular user
    List<Goal> findByUser_IdOrderByTargetDateAsc(Long userId);

    // Find a goal only if it belongs to that user
    Optional<Goal> findByIdAndUser_Id(Long id, Long userId);
}
