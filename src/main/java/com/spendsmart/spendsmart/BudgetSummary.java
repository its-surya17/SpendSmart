
package com.spendsmart.spendsmart;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class BudgetSummary {

    private Long id;
    private String category;
    private BigDecimal budget;
    private BigDecimal spent;
    private BigDecimal remaining;
    private double percentageUsed;

    public BudgetSummary(
            Long id,
            String category,
            BigDecimal budget,
            BigDecimal spent) {

        this.id = id;
        this.category = category;
        this.budget = budget;
        this.spent = spent;

        this.remaining = budget.subtract(spent);

        this.percentageUsed = budget.compareTo(BigDecimal.ZERO) > 0
                ? spent.multiply(BigDecimal.valueOf(100))
                        .divide(budget, 2, RoundingMode.HALF_UP)
                        .doubleValue()
                : 0;
    }

    public Long getId() {
        return id;
    }

    public String getCategory() {
        return category;
    }

    public BigDecimal getBudget() {
        return budget;
    }

    public BigDecimal getSpent() {
        return spent;
    }

    public BigDecimal getRemaining() {
        return remaining;
    }

    public double getPercentageUsed() {
        return percentageUsed;
    }

    public boolean isExceeded() {
        return spent.compareTo(budget) > 0;
    }
}
