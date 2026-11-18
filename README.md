# SpendSmart – Personal Finance Management System

SpendSmart is a full-stack personal finance management web application designed to help users track expenses, manage budgets, monitor bills and subscriptions, and organize savings goals in one place.

The application provides a centralized dashboard to help users understand and manage their financial activities.

## Features

- **User Authentication:** Secure user registration, login, logout, and password management.
- **Dashboard:** View financial summaries and monthly spending insights.
- **Expense Management:** Add, view, and manage income and expenses.
- **Budget Management:** Create and monitor category-based monthly budgets.
- **Account Management:** Manage financial accounts and balances.
- **Bill Tracking:** Track upcoming bills and mark payments as completed.
- **Subscription Management:** Monitor recurring subscriptions and their payment status.
- **Savings Goals:** Set savings targets and track progress.
- **Reports and Analytics:** Visualize financial activities using charts.
- **User Data Isolation:** Keep each user's financial records associated with their own account.

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Java, Spring Boot |
| Database | MySQL |
| ORM | Spring Data JPA, Hibernate |
| Security | Spring Security, BCrypt |
| Build Tool | Maven |
| Data Visualization | Chart.js |
| Version Control | Git, GitHub |

## Project Structure

```text
SpendSmart/
├── src/
│   └── main/
│       ├── java/
│       │   └── com/spendsmart/spendsmart/
│       │       ├── Controllers
│       │       ├── Entities
│       │       ├── Repositories
│       │       ├── Security Configuration
│       │       └── Application Class
│       └── resources/
│           ├── static/
│           │   ├── CSS
│           │   ├── JavaScript
│           │   ├── HTML Pages
│           │   └── Images
│           └── application.properties
├── pom.xml
└── README.md
```

## Getting Started

Follow these instructions to run SpendSmart locally.

### Prerequisites

Make sure you have installed:

- Java JDK 21
- MySQL 8.0 or later
- Git
- A code editor such as Visual Studio Code

### 1. Clone the Repository

```bash
git clone https://github.com/its-surya17/SpendSmart.git
```

### 2. Navigate to the Project Folder

```bash
cd SpendSmart
```

### 3. Create the MySQL Database

Open MySQL Workbench and execute:

```sql
CREATE DATABASE spendsmart_db;
```

### 4. Configure Database Credentials

Open `src/main/resources/application.properties`.

Configure your database connection:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/spendsmart_db
spring.datasource.username=root
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

server.port=8080
```

Set the `DB_PASSWORD` environment variable to your own MySQL password.

For Windows PowerShell:

```powershell
$securePassword = Read-Host "Enter MySQL password" -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
```

Do not commit your database password or other private credentials to GitHub.

### 5. Run the Application

On Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

On systems with Maven installed:

```bash
mvn spring-boot:run
```

### 6. Open the Application

Once the Spring Boot application starts, visit:

```text
http://localhost:8080/login.html
```

Register a new account to start using SpendSmart.

## Security

- Passwords are hashed using BCrypt.
- Spring Security handles authentication and access control.
- Financial records are associated with individual user accounts.
- Database credentials are configured through environment variables.

## Future Enhancements

- Deploy the application to a cloud platform.
- Add downloadable financial reports.
- Introduce advanced spending analytics.
- Add recurring transaction automation.
- Improve mobile responsiveness.

## Author

**Surya S**

B.E. Computer Science and Engineering

GitHub: [its-surya17](https://github.com/its-surya17)

---

*SpendSmart – Track Smarter. Save Better. Spend Wisely.*
