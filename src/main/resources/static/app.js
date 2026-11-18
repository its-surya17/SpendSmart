// SpendSmart frontend - integrated dashboard

const API = {
  expenses: "/api/expenses",
  budgets: "/api/budgets",
  accounts: "/api/accounts",
  bills: "/api/bills",
  subscriptions: "/api/subscriptions",
  goals: "/api/goals"
};

const $ = id => document.getElementById(id);

const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const monthNow = () => today().slice(0, 7);

let transactions = [];
let editingTransactionId = null;
let charts = {};
let toastTimer;


// =====================================================
// API AND COMMON HELPERS
// =====================================================

async function api(url, options = {}) {

    const method = (options.method || "GET").toUpperCase();

    const headers = {
        ...(options.body ? {
            "Content-Type": "application/json"
        } : {}),
        ...(options.headers || {})
    };

    // CSRF protection for all requests that modify data.
    if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {

        const csrfResponse = await fetch("/api/auth/csrf", {
            method: "GET",
            credentials: "same-origin"
        });

        if (!csrfResponse.ok) {
            throw new Error("Unable to initialize security token.");
        }

        const csrfData = await csrfResponse.json();

        headers["X-XSRF-TOKEN"] = csrfData.token;
    }

    const response = await fetch(url, {
        ...options,
        method,
        credentials: "same-origin",
        headers
    });

    if (!response.ok) {
        let message = `Request failed (${response.status})`;

        try {
            const body = await response.json();
            message =
                body.detail ||
                body.message ||
                body.title ||
                message;
        } catch {}

        throw new Error(message);
    }

    if (response.status === 204) return null;

    const text = await response.text();

    return text ? JSON.parse(text) : null;
}

function toast(message, error = false) {
  const el = $("toast");

  el.textContent = message;
  el.classList.toggle("error", error);
  el.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 3000);
}

function setConnection(ok) {
  $("connectionStatus").textContent =
    ok ? "Connected" : "Connection issue";

  const dot = document.querySelector(".status-indicator");

  if (dot) {
    dot.style.background = ok ? "#159b72" : "#e45d70";
  }
}


// =====================================================
// CHART HELPERS
// =====================================================

function drawChart(id, type, data, options = {}) {
  const canvas = $(id);

  if (!canvas || typeof Chart === "undefined") return;

  if (charts[id]) {
    charts[id].destroy();
  }

  charts[id] = new Chart(canvas, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...options
    }
  });
}

function chartOptions() {
  return {
    plugins: {
      legend: {
        labels: {
          color: "#69758a",
          usePointStyle: true
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#8792a5" },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#8792a5" },
        grid: { color: "#edf0f5" }
      }
    }
  };
}


// =====================================================
// DASHBOARD SUMMARY
// =====================================================

async function loadSummary() {
  const s = await api(`${API.expenses}/summary`);

  $("balanceValue").textContent = money(s.balance);
  $("incomeValue").textContent = money(s.totalIncome);
  $("expenseValue").textContent = money(s.totalExpenses);

  drawChart(
    "financeChart",
    "doughnut",
    {
      labels: ["Income", "Expenses"],
      datasets: [{
        data: [
          Number(s.totalIncome) || 0,
          Number(s.totalExpenses) || 0
        ],
        backgroundColor: ["#20b486", "#ed7182"],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    {
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#69758a",
            usePointStyle: true,
            padding: 18
          }
        }
      }
    }
  );

  $("reportIncome").textContent = money(s.totalIncome);
  $("reportExpenses").textContent = money(s.totalExpenses);
  $("reportBalance").textContent = money(s.balance);
}


// =====================================================
// TRANSACTIONS
// =====================================================

function transactionQuery() {
  const p = new URLSearchParams();

  [
    "typeFilter",
    "categoryFilter",
    "startDate",
    "endDate"
  ].forEach((id, i) => {
    const v = $(id)?.value;

    if (v) {
      p.set(
        ["type", "category", "startDate", "endDate"][i],
        v
      );
    }
  });

  return p.toString();
}

async function loadTransactions() {
  const q = transactionQuery();

  transactions = await api(
    q ? `${API.expenses}?${q}` : API.expenses
  );

  renderTransactions();
  renderRecentTransactions();
}

function filteredTransactions() {
  const term = ($("searchInput")?.value || "")
    .trim()
    .toLowerCase();

  return transactions.filter(t =>
    `${t.description || ""} ${t.category || ""}`
      .toLowerCase()
      .includes(term)
  );
}

function transactionRow(t, withActions = true) {
  const income = t.type === "INCOME";

  return `
    <tr>
      <td>
        <b>${esc(t.description || t.category)}</b>
        <div class="muted">#${esc(t.id)}</div>
      </td>

      <td>
        <span class="category-pill">
          ${esc(t.category)}
        </span>
      </td>

      <td>${esc(t.date || "—")}</td>

      <td>
        <span class="type-pill ${income ? "type-income" : "type-expense"}">
          ${income ? "Income" : "Expense"}
        </span>
      </td>

      <td class="align-right ${income ? "amount-positive" : "amount-negative"}">
        ${income ? "+" : "−"}${money(t.amount)}
      </td>

      ${
        withActions
          ? `
            <td>
              <button
                class="row-action"
                data-tx="edit"
                data-id="${esc(t.id)}">
                Edit
              </button>

              <button
                class="row-action delete"
                data-tx="delete"
                data-id="${esc(t.id)}">
                Delete
              </button>
            </td>
          `
          : ""
      }
    </tr>
  `;
}

function renderTransactions() {
  const list = filteredTransactions();

  $("transactionCount").textContent =
    `${list.length} transaction${list.length === 1 ? "" : "s"}`;

  $("transactionsBody").innerHTML = list.length
    ? list.map(t => transactionRow(t)).join("")
    : `
      <tr>
        <td colspan="6" class="empty-state">
          No transactions found.
        </td>
      </tr>
    `;
}

function renderRecentTransactions() {
  const recent = [...transactions]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 5);

  $("recentTransactionsBody").innerHTML = recent.length
    ? recent.map(t => transactionRow(t, false)).join("")
    : `
      <tr>
        <td colspan="5" class="empty-state">
          No transactions yet. Add your first transaction.
        </td>
      </tr>
    `;
}


// =====================================================
// ANALYTICS AND REPORTS
// =====================================================

async function loadAnalytics() {
  const [monthly, categories] = await Promise.all([
    api(`${API.expenses}/monthly-summary`),
    api(`${API.expenses}/category-summary`)
  ]);

  const labels = (monthly || []).map(x => x.month);
  const opts = chartOptions();

  drawChart(
    "monthlyChart",
    "bar",
    {
      labels,
      datasets: [
        {
          label: "Income",
          data: monthly.map(x => Number(x.income) || 0),
          backgroundColor: "#20b486",
          borderRadius: 5
        },
        {
          label: "Expenses",
          data: monthly.map(x => Number(x.expenses) || 0),
          backgroundColor: "#ed7182",
          borderRadius: 5
        }
      ]
    },
    opts
  );

  drawChart(
    "categoryChart",
    "doughnut",
    {
      labels: categories.length
        ? categories.map(x => x.category)
        : ["No expenses yet"],

      datasets: [{
        data: categories.length
          ? categories.map(x => Number(x.total) || 0)
          : [1],

        backgroundColor: categories.length
          ? [
              "#635bff",
              "#20b486",
              "#f0b44d",
              "#ed7182",
              "#65a6df",
              "#a27bd8",
              "#39b8c5"
            ]
          : ["#e7eaf0"],

        borderWidth: 0
      }]
    },
    {
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#69758a",
            usePointStyle: true
          }
        }
      }
    }
  );

  drawChart(
    "reportMonthlyChart",
    "bar",
    {
      labels,
      datasets: [
        {
          label: "Income",
          data: (monthly || []).map(x => Number(x.income) || 0),
          backgroundColor: "#20b486",
          borderRadius: 5
        },
        {
          label: "Expenses",
          data: (monthly || []).map(x => Number(x.expenses) || 0),
          backgroundColor: "#ed7182",
          borderRadius: 5
        }
      ]
    },
    opts
  );

  drawChart(
    "reportCategoryChart",
    "doughnut",
    {
      labels: categories.length
        ? categories.map(x => x.category)
        : ["No expenses yet"],

      datasets: [{
        data: categories.length
          ? categories.map(x => Number(x.total) || 0)
          : [1],

        backgroundColor: [
          "#635bff",
          "#20b486",
          "#f0b44d",
          "#ed7182",
          "#65a6df",
          "#a27bd8"
        ],

        borderWidth: 0
      }]
    },
    {
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#69758a",
            usePointStyle: true
          }
        }
      }
    }
  );
}


// =====================================================
// REFRESH DASHBOARD
// =====================================================

async function refreshDashboard() {
  const results = await Promise.allSettled([
    loadSummary(),
    loadTransactions(),
    loadAnalytics(),
    loadBudgets()
  ]);

  const ok = results.every(x => x.status === "fulfilled");

  setConnection(ok);

  if (!ok) {
    const errors = results
      .filter(x => x.status === "rejected")
      .map(x => x.reason?.message)
      .join("; ");

    console.error(errors);

    toast(
      "Some dashboard data could not be loaded. Check the relevant API.",
      true
    );
  }

  return ok;
}


// =====================================================
// ADD / EDIT TRANSACTION
// =====================================================

function openTransaction(type = "EXPENSE", t = null) {
  editingTransactionId = t?.id ?? null;

  $("transactionForm").reset();
  $("formError").textContent = "";

  $("dialogTitle").textContent =
    t ? "Edit transaction" : "Add transaction";

  $("transactionType").value = t?.type || type;
  $("amount").value = t?.amount ?? "";
  $("category").value = t?.category || "";
  $("transactionDate").value = t?.date || today();
  $("description").value = t?.description || "";

  $("saveBtn").textContent =
    t ? "Update transaction" : "Save transaction";

  $("transactionDialog").showModal();
}

async function saveTransaction(e) {
  e.preventDefault();

  $("formError").textContent = "";

  const payload = {
    amount: Number($("amount").value),
    type: $("transactionType").value,
    category: $("category").value,
    date: $("transactionDate").value,
    description: $("description").value.trim()
  };

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    $("formError").textContent =
      "Enter an amount greater than zero.";
    return;
  }

  const editing = editingTransactionId !== null;

  try {
    await api(
      editing
        ? `${API.expenses}/${editingTransactionId}`
        : API.expenses,
      {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      }
    );

    $("transactionDialog").close();

    toast(
      editing
        ? "Transaction updated."
        : "Transaction added."
    );

    await refreshDashboard();

  } catch (err) {
    $("formError").textContent = err.message;
  }
}

async function deleteTransaction(id) {
  const t = transactions.find(
    x => String(x.id) === String(id)
  );

  if (
    !t ||
    !confirm(
      `Delete ${t.description || t.category} (${money(t.amount)})?`
    )
  ) {
    return;
  }

  try {
    await api(`${API.expenses}/${id}`, {
      method: "DELETE"
    });

    toast("Transaction deleted.");

    await refreshDashboard();

  } catch (e) {
    toast(e.message, true);
  }
}


// =====================================================
// BUDGET MANAGEMENT
// =====================================================

async function loadBudgets() {
  if (!$("budgetMonth")) return;

  const month = $("budgetMonth").value || monthNow();

  const list = await api(
    `${API.budgets}/summary?month=${encodeURIComponent(month)}`
  );

  renderBudgets(list || []);

  $("dashboardBudgetCount").textContent =
    String((list || []).length);
}

function renderBudgets(list) {
  const total = list.find(
    x => String(x.category).toLowerCase() === "overall"
  );

  const budget = total
    ? Number(total.budget)
    : list.reduce((s, x) => s + Number(x.budget || 0), 0);

  const spent = total
    ? Number(total.spent)
    : list.reduce((s, x) => s + Number(x.spent || 0), 0);

  $("totalBudget").textContent = money(budget);
  $("totalBudgetSpent").textContent = money(spent);
  $("budgetRemaining").textContent = money(budget - spent);

  $("budgetCards").innerHTML = list.length
    ? list.map(x => {
        const pct = Number(x.percentageUsed) || 0;

        const cls =
          pct >= 100 ? "danger" :
          pct >= 80 ? "warning" : "";

        return `
          <article class="module-card">

            <div class="module-meta">
              <span>BUDGET</span>

              <button
                class="row-action delete"
                data-budget-delete="${x.id}">
                Delete
              </button>
            </div>

            <h3>${esc(x.category)}</h3>

            <div class="module-amount">
              ${money(x.spent)}
              <small class="muted">/ ${money(x.budget)}</small>
            </div>

            <div class="progress-track">
              <div
                class="progress-fill ${cls}"
                style="width:${Math.min(100, Math.max(0, pct))}%">
              </div>
            </div>

            <div class="module-meta">
              <span>${pct.toFixed(1)}% used</span>
              <b>${money(x.remaining)} left</b>
            </div>

          </article>
        `;
      }).join("")
    : `
      <div class="empty-card">
        No budgets created for this month yet.
      </div>
    `;

  $("budgetAlerts").innerHTML = list
    .filter(x => Number(x.percentageUsed) >= 80)
    .map(x => `
      <div class="alert ${Number(x.percentageUsed) >= 100 ? "danger" : ""}">
        ${Number(x.percentageUsed) >= 100 ? "⚠" : "↗"}
        ${esc(x.category)}:
        ${Number(x.percentageUsed).toFixed(1)}% of budget used.
      </div>
    `)
    .join("");
}

$("budgetForm").addEventListener("submit", async e => {
  e.preventDefault();

  const payload = {
    category: $("budgetCategory").value,
    amount: Number($("budgetAmount").value),
    month: $("budgetFormMonth").value
  };

  try {
    await api(API.budgets, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    $("budgetForm").reset();

    $("budgetMonth").value = payload.month;
    $("budgetFormMonth").value = payload.month;

    await loadBudgets();

    toast("Budget saved.");

  } catch (err) {
    toast(err.message, true);
  }
});

$("budgetCards").addEventListener("click", async e => {
  const b = e.target.closest("[data-budget-delete]");

  if (!b || !confirm("Delete this budget?")) return;

  try {
    await api(
      `${API.budgets}/${b.dataset.budgetDelete}`,
      { method: "DELETE" }
    );

    await loadBudgets();

    toast("Budget deleted.");

  } catch (err) {
    toast(err.message, true);
  }
});

$("budgetMonth").value = monthNow();
$("budgetFormMonth").value = monthNow();

$("budgetMonth").addEventListener("change", () => {
  $("budgetFormMonth").value = $("budgetMonth").value;

  loadBudgets().catch(e => toast(e.message, true));
});


// =====================================================
// ACCOUNTS
// =====================================================

function actions(id, type) {
  return `
    <div class="module-actions">

      <button
        class="row-action"
        data-${type}-edit="${id}">
        Edit
      </button>

      <button
        class="row-action delete"
        data-${type}-delete="${id}">
        Delete
      </button>

    </div>
  `;
}

let accounts = [];
let bills = [];
let subscriptions = [];
let goals = [];

function resetAccount() {
  $("accountForm").reset();

  $("accountId").value = "";
  $("accountOpeningBalance").value = "0";

  $("accountFormHeading").textContent = "Add an account";
  $("accountSubmit").textContent = "Save account";
}

async function loadAccounts() {
  accounts = await api(API.accounts);

  $("accountsList").innerHTML = accounts.length
    ? accounts.map(a => `
        <article class="module-card">

          <div class="module-meta">
            <span>ACCOUNT</span>
            <span class="category-pill">
              ${esc(a.accountType)}
            </span>
          </div>

          <h3>${esc(a.name)}</h3>

          <p>${esc(a.institution || "Personal account")}</p>

          <div class="module-amount">
            ${money(a.openingBalance)}
          </div>

          <p>${esc(a.description || "No description")}</p>

          ${actions(a.id, "account")}

        </article>
      `).join("")
    : `
      <div class="empty-card">
        No accounts yet. Add your first account above.
      </div>
    `;
}

$("accountForm").addEventListener("submit", async e => {
  e.preventDefault();

  const id = $("accountId").value;

  const payload = {
    name: $("accountName").value.trim(),
    accountType: $("accountType").value,
    institution: $("accountInstitution").value.trim(),
    openingBalance: Number($("accountOpeningBalance").value),
    description: $("accountDescription").value.trim()
  };

  try {
    await api(
      id ? `${API.accounts}/${id}` : API.accounts,
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      }
    );

    resetAccount();

    await loadAccounts();

    toast(id ? "Account updated." : "Account created.");

  } catch (err) {
    toast(err.message, true);
  }
});

$("accountCancel").addEventListener("click", resetAccount);

$("accountsList").addEventListener("click", async e => {
  const edit = e.target.closest("[data-account-edit]");
  const del = e.target.closest("[data-account-delete]");

  if (edit) {
    const a = accounts.find(
      x => String(x.id) === edit.dataset.accountEdit
    );

    if (!a) return;

    $("accountId").value = a.id;
    $("accountName").value = a.name;
    $("accountType").value = a.accountType;
    $("accountInstitution").value = a.institution || "";
    $("accountOpeningBalance").value = a.openingBalance;
    $("accountDescription").value = a.description || "";

    $("accountFormHeading").textContent = "Edit account";
    $("accountSubmit").textContent = "Update account";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (del && confirm("Delete this account?")) {
    try {
      await api(
        `${API.accounts}/${del.dataset.accountDelete}`,
        { method: "DELETE" }
      );

      await loadAccounts();

      toast("Account deleted.");

    } catch (err) {
      toast(err.message, true);
    }
  }
});


// =====================================================
// BILLS
// =====================================================

function resetBill() {
  $("billForm").reset();

  $("billId").value = "";

  $("billFormHeading").textContent = "Add a bill";
  $("billSubmit").textContent = "Save bill";
}

async function loadBills() {
  bills = await api(API.bills);

  $("billsList").innerHTML = bills.length
    ? bills.map(b => `
        <article class="module-card">

          <div class="module-meta">
            <span>BILL</span>

            <span class="status-pill ${
              b.status === "Paid" ? "status-paid" : "status-pending"
            }">
              ${esc(b.status)}
            </span>
          </div>

          <h3>${esc(b.title)}</h3>

          <p>${esc(b.category)}</p>

          <div class="module-amount">
            ${money(b.amount)}
          </div>

          <div class="module-meta">
            <span>Due date</span>
            <b>${esc(b.dueDate)}</b>
          </div>

          <div class="module-actions">

            ${
              b.status !== "Paid"
                ? `<button class="row-action" data-bill-pay="${b.id}">
                     Mark paid
                   </button>`
                : ""
            }

            <button class="row-action" data-bill-edit="${b.id}">
              Edit
            </button>

            <button class="row-action delete" data-bill-delete="${b.id}">
              Delete
            </button>

          </div>

        </article>
      `).join("")
    : `
      <div class="empty-card">
        No bills added yet.
      </div>
    `;
}

$("billForm").addEventListener("submit", async e => {
  e.preventDefault();

  const id = $("billId").value;

  const p = {
    title: $("billTitle").value.trim(),
    category: $("billCategory").value.trim(),
    amount: Number($("billAmount").value),
    dueDate: $("billDueDate").value,
    status: $("billStatus").value
  };

  try {
    await api(
      id ? `${API.bills}/${id}` : API.bills,
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(p)
      }
    );

    resetBill();

    await loadBills();

    toast("Bill saved.");

  } catch (err) {
    toast(err.message, true);
  }
});

$("billCancel").addEventListener("click", resetBill);

$("billsList").addEventListener("click", async e => {
  const pay = e.target.closest("[data-bill-pay]");
  const edit = e.target.closest("[data-bill-edit]");
  const del = e.target.closest("[data-bill-delete]");

  try {
    if (pay) {
      await api(
        `${API.bills}/${pay.dataset.billPay}/pay`,
        { method: "PATCH" }
      );

      await loadBills();

      toast("Bill marked as paid.");
    }

    if (edit) {
      const b = bills.find(
        x => String(x.id) === edit.dataset.billEdit
      );

      if (!b) return;

      $("billId").value = b.id;
      $("billTitle").value = b.title;
      $("billCategory").value = b.category;
      $("billAmount").value = b.amount;
      $("billDueDate").value = b.dueDate;
      $("billStatus").value = b.status;

      $("billFormHeading").textContent = "Edit bill";
      $("billSubmit").textContent = "Update bill";

      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (del && confirm("Delete this bill?")) {
      await api(
        `${API.bills}/${del.dataset.billDelete}`,
        { method: "DELETE" }
      );

      await loadBills();

      toast("Bill deleted.");
    }

  } catch (err) {
    toast(err.message, true);
  }
});


// =====================================================
// SUBSCRIPTIONS
// =====================================================

function resetSubscription() {
  $("subscriptionForm").reset();

  $("subscriptionId").value = "";
  $("subscriptionActive").checked = true;

  $("subscriptionFormHeading").textContent = "Add a subscription";
  $("subscriptionSubmit").textContent = "Save subscription";
}

async function loadSubscriptions() {
  subscriptions = await api(API.subscriptions);

  $("subscriptionsList").innerHTML = subscriptions.length
    ? subscriptions.map(s => `
        <article class="module-card">

          <div class="module-meta">
            <span>SUBSCRIPTION</span>

            <span class="status-pill ${
              s.active ? "status-paid" : "status-pending"
            }">
              ${s.active ? "Active" : "Paused"}
            </span>
          </div>

          <h3>${esc(s.name)}</h3>

          <div class="module-amount">
            ${money(s.amount)}
            <small class="muted">/ ${esc(s.billingCycle)}</small>
          </div>

          <div class="module-meta">
            <span>Next payment</span>
            <b>${esc(s.nextPaymentDate)}</b>
          </div>

          <div class="module-actions">

            <button class="row-action" data-sub-toggle="${s.id}">
              ${s.active ? "Pause" : "Activate"}
            </button>

            <button class="row-action" data-sub-edit="${s.id}">
              Edit
            </button>

            <button class="row-action delete" data-sub-delete="${s.id}">
              Delete
            </button>

          </div>

        </article>
      `).join("")
    : `
      <div class="empty-card">
        No subscriptions added yet.
      </div>
    `;
}

$("subscriptionForm").addEventListener("submit", async e => {
  e.preventDefault();

  const id = $("subscriptionId").value;

  const p = {
    name: $("subscriptionName").value.trim(),
    amount: Number($("subscriptionAmount").value),
    billingCycle: $("subscriptionCycle").value,
    nextPaymentDate: $("subscriptionDate").value,
    active: $("subscriptionActive").checked
  };

  try {
    await api(
      id ? `${API.subscriptions}/${id}` : API.subscriptions,
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(p)
      }
    );

    resetSubscription();

    await loadSubscriptions();

    toast("Subscription saved.");

  } catch (err) {
    toast(err.message, true);
  }
});

$("subscriptionCancel").addEventListener(
  "click",
  resetSubscription
);

$("subscriptionsList").addEventListener("click", async e => {
  const toggle = e.target.closest("[data-sub-toggle]");
  const edit = e.target.closest("[data-sub-edit]");
  const del = e.target.closest("[data-sub-delete]");

  try {
    if (toggle) {
      await api(
        `${API.subscriptions}/${toggle.dataset.subToggle}/toggle`,
        { method: "PATCH" }
      );

      await loadSubscriptions();

      toast("Subscription status updated.");
    }

    if (edit) {
      const s = subscriptions.find(
        x => String(x.id) === edit.dataset.subEdit
      );

      if (!s) return;

      $("subscriptionId").value = s.id;
      $("subscriptionName").value = s.name;
      $("subscriptionAmount").value = s.amount;
      $("subscriptionCycle").value = s.billingCycle;
      $("subscriptionDate").value = s.nextPaymentDate;
      $("subscriptionActive").checked = s.active;

      $("subscriptionFormHeading").textContent =
        "Edit subscription";

      $("subscriptionSubmit").textContent =
        "Update subscription";

      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (del && confirm("Delete this subscription?")) {
      await api(
        `${API.subscriptions}/${del.dataset.subDelete}`,
        { method: "DELETE" }
      );

      await loadSubscriptions();

      toast("Subscription deleted.");
    }

  } catch (err) {
    toast(err.message, true);
  }
});


// =====================================================
// SAVINGS GOALS
// =====================================================

function resetGoal() {
  $("goalForm").reset();

  $("goalId").value = "";
  $("goalSaved").value = "0";

  $("goalFormHeading").textContent =
    "Create a savings goal";

  $("goalSubmit").textContent = "Save goal";
}

async function loadGoals() {
  goals = await api(API.goals);

  $("goalsList").innerHTML = goals.length
    ? goals.map(g => {
        const pct = g.targetAmount
          ? Math.min(
              100,
              Number(g.savedAmount) / Number(g.targetAmount) * 100
            )
          : 0;

        return `
          <article class="module-card">

            <div class="module-meta">
              <span>SAVINGS GOAL</span>
              <span>${pct.toFixed(1)}%</span>
            </div>

            <h3>${esc(g.name)}</h3>

            <div class="module-amount">
              ${money(g.savedAmount)}
              <small class="muted">/ ${money(g.targetAmount)}</small>
            </div>

            <div class="progress-track">
              <div
                class="progress-fill"
                style="width:${pct}%">
              </div>
            </div>

            <div class="module-meta">
              <span>Target date</span>
              <b>${esc(g.targetDate)}</b>
            </div>

            <div class="module-meta">
              <span>Still needed</span>
              <b>
                ${money(
                  Math.max(
                    0,
                    Number(g.targetAmount) - Number(g.savedAmount)
                  )
                )}
              </b>
            </div>

            <div class="module-actions">

              <button class="row-action" data-goal-add="${g.id}">
                ＋ Add savings
              </button>

              <button class="row-action" data-goal-edit="${g.id}">
                Edit
              </button>

              <button class="row-action delete" data-goal-delete="${g.id}">
                Delete
              </button>

            </div>

          </article>
        `;
      }).join("")
    : `
      <div class="empty-card">
        No savings goals yet. Create your first goal above.
      </div>
    `;
}

$("goalForm").addEventListener("submit", async e => {
  e.preventDefault();

  const id = $("goalId").value;

  const p = {
    name: $("goalName").value.trim(),
    targetAmount: Number($("goalTarget").value),
    savedAmount: Number($("goalSaved").value),
    targetDate: $("goalDate").value
  };

  try {
    await api(
      id ? `${API.goals}/${id}` : API.goals,
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(p)
      }
    );

    resetGoal();

    await loadGoals();

    toast("Savings goal saved.");

  } catch (err) {
    toast(err.message, true);
  }
});

$("goalCancel").addEventListener("click", resetGoal);

$("goalsList").addEventListener("click", async e => {
  const add = e.target.closest("[data-goal-add]");
  const edit = e.target.closest("[data-goal-edit]");
  const del = e.target.closest("[data-goal-delete]");

  try {
    if (add) {
      const g = goals.find(
        x => String(x.id) === add.dataset.goalAdd
      );

      if (!g) return;

      const raw = prompt(
        `How much would you like to add to ${g.name}?`
      );

      if (raw === null) return;

      const amount = Number(raw);

      if (!Number.isFinite(amount) || amount <= 0) {
        toast("Enter a valid positive amount.", true);
        return;
      }

      await api(
        `${API.goals}/${g.id}/add-savings?amount=${encodeURIComponent(amount)}`,
        { method: "PATCH" }
      );

      await loadGoals();

      toast("Savings added.");
    }

    if (edit) {
      const g = goals.find(
        x => String(x.id) === edit.dataset.goalEdit
      );

      if (!g) return;

      $("goalId").value = g.id;
      $("goalName").value = g.name;
      $("goalTarget").value = g.targetAmount;
      $("goalSaved").value = g.savedAmount;
      $("goalDate").value = g.targetDate;

      $("goalFormHeading").textContent =
        "Edit savings goal";

      $("goalSubmit").textContent = "Update goal";

      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (del && confirm("Delete this savings goal?")) {
      await api(
        `${API.goals}/${del.dataset.goalDelete}`,
        { method: "DELETE" }
      );

      await loadGoals();

      toast("Goal deleted.");
    }

  } catch (err) {
    toast(err.message, true);
  }
});


// =====================================================
// NAVIGATION
// =====================================================

const pageMap = {
  dashboard: "dashboardPage",
  transactions: "transactionsPage",
  accounts: "accountsPage",
  budgetSection: "budgetSection",
  bills: "billsPage",
  subscriptions: "subscriptionsPage",
  goals: "goalsPage",
  reports: "reportsPage",
  settings: "settingsPage"
};

const titles = {
  dashboard: [
    "Dashboard",
    "Your financial life, all in one place."
  ],
  transactions: [
    "Transactions",
    "Search and manage your financial activity."
  ],
  accounts: [
    "Accounts",
    "Manage your bank accounts, wallets and cash."
  ],
  budgetSection: [
    "Budgets",
    "Plan your monthly spending."
  ],
  bills: [
    "Bills",
    "Keep track of upcoming payments."
  ],
  subscriptions: [
    "Subscriptions",
    "Manage recurring services."
  ],
  goals: [
    "Savings goals",
    "Make progress towards your financial goals."
  ],
  reports: [
    "Reports",
    "Understand your financial performance."
  ],
  settings: [
    "Settings",
    "Personalize your experience."
  ]
};

function navigate(page) {
  const target = pageMap[page] || "dashboardPage";

  document.querySelectorAll(".page-section").forEach(s => {
    s.classList.toggle("active-page", s.id === target);
  });

  document.querySelectorAll(".nav-link[data-page]").forEach(a => {
    a.classList.toggle("active", a.dataset.page === page);
  });

  $("pageTitle").textContent =
    titles[page]?.[0] || "Dashboard";

  $("pageSubtitle").textContent =
    titles[page]?.[1] || "";

  $("sidebar").classList.remove("open");

  if (page === "accounts") {
    loadAccounts().catch(e => toast(e.message, true));
  }

  if (page === "bills") {
    loadBills().catch(e => toast(e.message, true));
  }

  if (page === "subscriptions") {
    loadSubscriptions().catch(e => toast(e.message, true));
  }

  if (page === "goals") {
    loadGoals().catch(e => toast(e.message, true));
  }

  if (page === "reports") {
    Promise.all([
      loadSummary(),
      loadAnalytics()
    ]).catch(e => toast(e.message, true));
  }

  if (page === "budgetSection") {
    loadBudgets().catch(e => toast(e.message, true));
  }
}

document.querySelectorAll("[data-page]").forEach(a => {
  a.addEventListener("click", e => {
    e.preventDefault();

    const p = a.dataset.page;

    navigate(p);

    history.replaceState(null, "", `#${p}`);
  });
});

document.querySelectorAll('a[href^="#"]').forEach(a => {
  if (a.dataset.page) return;

  a.addEventListener("click", e => {
    const p = a.getAttribute("href").slice(1);

    if (pageMap[p]) {
      e.preventDefault();

      navigate(p);

      history.replaceState(null, "", `#${p}`);
    }
  });
});

$("mobileMenu").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});


// =====================================================
// TRANSACTION EVENTS AND FILTERS
// =====================================================

$("addTransactionBtn").addEventListener(
  "click",
  () => openTransaction()
);

$("transactionsAddBtn").addEventListener(
  "click",
  () => openTransaction()
);

$("quickIncomeBtn").addEventListener(
  "click",
  () => openTransaction("INCOME")
);

$("quickExpenseBtn").addEventListener(
  "click",
  () => openTransaction("EXPENSE")
);

$("closeDialogBtn").addEventListener(
  "click",
  () => $("transactionDialog").close()
);

$("cancelBtn").addEventListener(
  "click",
  () => $("transactionDialog").close()
);

$("transactionForm").addEventListener(
  "submit",
  saveTransaction
);

$("transactionsBody").addEventListener("click", e => {
  const b = e.target.closest("[data-tx]");

  if (!b) return;

  const id = b.dataset.id;

  if (b.dataset.tx === "delete") {
    deleteTransaction(id);
  } else {
    const t = transactions.find(
      x => String(x.id) === id
    );

    if (t) {
      openTransaction(t.type, t);
    }
  }
});

$("searchInput").addEventListener(
  "input",
  renderTransactions
);

$("applyFiltersBtn").addEventListener("click", async () => {
  if (
    $("startDate").value &&
    $("endDate").value &&
    $("startDate").value > $("endDate").value
  ) {
    toast("Start date cannot be after end date.", true);
    return;
  }

  try {
    await loadTransactions();
  } catch (e) {
    toast(e.message, true);
  }
});

$("clearFiltersBtn").addEventListener("click", async () => {
  [
    "searchInput",
    "typeFilter",
    "categoryFilter",
    "startDate",
    "endDate"
  ].forEach(id => {
    $(id).value = "";
  });

  try {
    await loadTransactions();
  } catch (e) {
    toast(e.message, true);
  }
});

$("refreshBtn").addEventListener("click", async () => {
  if (await refreshDashboard()) {
    toast("Dashboard refreshed.");
  }
});

$("refreshReportsBtn").addEventListener("click", async () => {
  try {
    await loadSummary();
    await loadAnalytics();

    toast("Reports refreshed.");

  } catch (e) {
    toast(e.message, true);
  }
});

$("transactionDialog").addEventListener("click", e => {
  if (e.target === $("transactionDialog")) {
    $("transactionDialog").close();
  }
});


// =====================================================
// SETTINGS
// =====================================================

function loadSettings() {
  const s = JSON.parse(
    localStorage.getItem("spendsmart-settings") || "{}"
  );

  $("settingsName").value = s.name || "";
  $("settingsCompact").checked = !!s.compact;

  document.body.classList.toggle(
    "compact-mode",
    !!s.compact
  );
}

$("saveSettingsBtn").addEventListener("click", () => {
  const s = {
    name: $("settingsName").value.trim(),
    compact: $("settingsCompact").checked
  };

  localStorage.setItem(
    "spendsmart-settings",
    JSON.stringify(s)
  );

  document.body.classList.toggle(
    "compact-mode",
    s.compact
  );

  toast("Settings saved in this browser.");
});


// =====================================================
// INITIALIZE APPLICATION
// =====================================================

loadSettings();

if (
  location.hash &&
  Object.keys(pageMap).includes(location.hash.slice(1))
) {
  navigate(location.hash.slice(1));
}

refreshDashboard().catch(e => {
  console.error(e);
  setConnection(false);
});


// CHANGE PASSWORD FUNCTIONALITY
document.addEventListener("DOMContentLoaded", () => {

    const passwordForm = document.getElementById("changePasswordForm");

    if (!passwordForm) return;

    const currentPassword = document.getElementById("currentPassword");
    const newPassword = document.getElementById("newPassword");
    const confirmNewPassword = document.getElementById("confirmNewPassword");
    const passwordMessage = document.getElementById("passwordMessage");
    const changeButton = document.getElementById("changePasswordButton");

    // Show / hide password
    document.querySelectorAll(".password-toggle").forEach(button => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.target);

            if (!input) return;

            input.type = input.type === "password" ? "text" : "password";
            button.textContent = input.type === "password" ? "Show" : "Hide";
        });
    });

    // Read CSRF token
    function getCsrfToken() {
        const cookie = document.cookie
            .split("; ")
            .find(row => row.startsWith("XSRF-TOKEN="));

        return cookie
            ? decodeURIComponent(cookie.substring("XSRF-TOKEN=".length))
            : null;
    }

    passwordForm.addEventListener("submit", async event => {

        event.preventDefault();

        const current = currentPassword.value;
        const newPass = newPassword.value;
        const confirmPass = confirmNewPassword.value;

        passwordMessage.textContent = "";
        passwordMessage.style.color = "";

        if (newPass.length < 8) {
            passwordMessage.textContent = "New password must contain at least 8 characters.";
            passwordMessage.style.color = "red";
            return;
        }

        if (newPass !== confirmPass) {
            passwordMessage.textContent = "New passwords do not match.";
            passwordMessage.style.color = "red";
            return;
        }

        if (current === newPass) {
            passwordMessage.textContent = "New password must be different from current password.";
            passwordMessage.style.color = "red";
            return;
        }

        const csrfToken = getCsrfToken();

        if (!csrfToken) {
            passwordMessage.textContent = "Security token missing. Refresh the page and try again.";
            passwordMessage.style.color = "red";
            return;
        }

        changeButton.disabled = true;
        changeButton.textContent = "Updating...";

        try {
            const response = await fetch("/api/auth/change-password", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": csrfToken
                },
                body: JSON.stringify({
                    currentPassword: current,
                    newPassword: newPass
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Unable to update password.");
            }

            passwordMessage.textContent = "Password changed successfully!";
            passwordMessage.style.color = "green";

            passwordForm.reset();

            document.querySelectorAll(".password-toggle").forEach(button => {
                button.textContent = "Show";
            });

        } catch (error) {
            passwordMessage.textContent = error.message;
            passwordMessage.style.color = "red";

        } finally {
            changeButton.disabled = false;
            changeButton.textContent = "Update Password";
        }
    });
});
