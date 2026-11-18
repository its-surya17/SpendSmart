
package com.spendsmart.spendsmart;

import java.math.BigDecimal;

public class MonthlySummary {

    private String month;
    private BigDecimal income;
    private BigDecimal expenses;

    public MonthlySummary(
            String month,
            BigDecimal income,
            BigDecimal expenses) {

        this.month = month;
        this.income = income;
        this.expenses = expenses;
    }

    public String getMonth() {
        return month;
    }

    public BigDecimal getIncome() {
        return income;
    }

    public BigDecimal getExpenses() {
        return expenses;
    }
}
