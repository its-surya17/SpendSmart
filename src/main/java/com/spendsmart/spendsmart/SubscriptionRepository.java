
package com.spendsmart.spendsmart;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository
        extends JpaRepository<Subscription, Long> {

    // Retrieve subscriptions belonging to a particular user
    List<Subscription> findByUser_IdOrderByNextPaymentDateAsc(Long userId);

    // Find a subscription only if it belongs to that user
    Optional<Subscription> findByIdAndUser_Id(Long id, Long userId);
}
