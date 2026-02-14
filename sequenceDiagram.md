# Sequence Diagrams

Two flows are documented here — creating a transaction (the most common write path) and generating AI insights (the most interesting read path).

---

## Flow 1: Create a Transaction

When a user submits a new transaction, the request goes through JWT auth middleware, Joi validation, an ownership check on the category, an FX conversion if needed, and finally the DB write. On success the dashboard cache is invalidated so the next dashboard load reflects the new data.

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant AuthMiddleware
    participant TransactionController
    participant TransactionService
    participant CategoryRepository
    participant TransactionRepository
    participant ExchangeRateUtil
    participant DB as PostgreSQL

    User->>Client: Fill transaction form and submit
    Client->>AuthMiddleware: POST /api/v1/transactions (Bearer token)

    AuthMiddleware->>AuthMiddleware: verify JWT, extract userId
    alt Token invalid or expired
        AuthMiddleware-->>Client: 401 Unauthorized
        Client-->>User: Redirect to login
    end

    AuthMiddleware->>TransactionController: req.user.id = userId

    TransactionController->>TransactionController: Joi.validate(req.body)
    alt Validation fails
        TransactionController-->>Client: 422 Unprocessable Entity
        Client-->>User: Highlight field errors
    end

    TransactionController->>TransactionService: create(userId, data)

    TransactionService->>CategoryRepository: findById(categoryId)
    CategoryRepository->>DB: SELECT * FROM categories WHERE id = categoryId
    DB-->>CategoryRepository: category row
    CategoryRepository-->>TransactionService: Category

    alt Category not owned by user
        TransactionService-->>TransactionController: ForbiddenError
        TransactionController-->>Client: 403 Forbidden
    end

    alt type mismatch (e.g. income tx in expense category)
        TransactionService-->>TransactionController: BadRequestError
        TransactionController-->>Client: 400 Bad Request
    end

    alt currency != user base_currency
        TransactionService->>ExchangeRateUtil: convert(amount, currency, baseCurrency)
        ExchangeRateUtil->>DB: SELECT rate FROM exchange_rates WHERE base=baseCurrency AND target=currency
        DB-->>ExchangeRateUtil: rate row
        ExchangeRateUtil-->>TransactionService: amountInBase, exchangeRate
    end

    TransactionService->>TransactionRepository: create(transactionData)
    TransactionRepository->>DB: INSERT INTO transactions (...)
    DB-->>TransactionRepository: saved row
    TransactionRepository-->>TransactionService: Transaction

    TransactionService->>TransactionService: invalidateDashboardCache(userId)
    TransactionService-->>TransactionController: Transaction
    TransactionController-->>Client: 201 Created { success: true, data: transaction }
    Client-->>User: Transaction added, totals update
```

---

## Flow 2: Generate AI Insights

The insights endpoint checks the cache first. On a miss it pulls 3 months of aggregated spending from the DB, sends a structured prompt to Groq, parses the JSON response, and caches the result for 24 hours.

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant InsightsController
    participant InsightsService
    participant NodeCache
    participant TransactionRepository
    participant GroqClient
    participant DB as PostgreSQL
    participant Groq as Groq API

    User->>Client: Open Insights page
    Client->>InsightsController: GET /api/v1/insights/generate (Bearer token)

    InsightsController->>InsightsService: generate(userId)

    InsightsService->>NodeCache: get(insights:userId)
    alt Cache hit
        NodeCache-->>InsightsService: cached insights[]
        InsightsService-->>InsightsController: insights[]
        InsightsController-->>Client: 200 OK (from cache)
        Client-->>User: Show insights
    end

    InsightsService->>TransactionRepository: aggregateByMonth(userId, 3)
    TransactionRepository->>DB: SELECT category, type, SUM(amount_in_base) GROUP BY month, category
    DB-->>TransactionRepository: aggregated rows
    TransactionRepository-->>InsightsService: spending summary

    InsightsService->>InsightsService: build structured prompt (no raw IDs or descriptions)

    InsightsService->>GroqClient: chat(messages, jsonMode=true)
    GroqClient->>Groq: POST /openai/v1/chat/completions (llama-3.3-70b-versatile)
    Groq-->>GroqClient: response with JSON array
    GroqClient->>GroqClient: stripMarkdownFences(text)
    GroqClient-->>InsightsService: parsed insights[]

    InsightsService->>InsightsService: validate each insight has title + body + action
    InsightsService->>NodeCache: set(insights:userId, insights, 86400s)

    InsightsService-->>InsightsController: insights[]
    InsightsController-->>Client: 200 OK { success: true, data: insights[] }
    Client-->>User: Show AI insight cards
```

---

## Flow 3: Budget Alert (Background Job)

This runs on a node-cron schedule (every hour). It checks all active budgets, computes spend against the limit, and writes a notification for any budget that has crossed its alert threshold since the last check.

```mermaid
sequenceDiagram
    participant Cron as node-cron (hourly)
    participant BudgetAlertJob
    participant BudgetRepository
    participant TransactionRepository
    participant NotificationRepository
    participant DB as PostgreSQL

    Cron->>BudgetAlertJob: trigger()

    BudgetAlertJob->>BudgetRepository: findAllActive()
    BudgetRepository->>DB: SELECT * FROM budgets WHERE is_active = true
    DB-->>BudgetRepository: budget rows
    BudgetRepository-->>BudgetAlertJob: budgets[]

    loop For each budget
        BudgetAlertJob->>TransactionRepository: sumSpend(userId, categoryId, period)
        TransactionRepository->>DB: SELECT SUM(amount_in_base) WHERE type=expense AND date in period
        DB-->>TransactionRepository: total spent
        TransactionRepository-->>BudgetAlertJob: spentAmount

        BudgetAlertJob->>BudgetAlertJob: pct = spentAmount / budget.amount * 100

        alt pct >= alert_threshold AND not already notified
            BudgetAlertJob->>NotificationRepository: create(userId, BUDGET_ALERT, payload)
            NotificationRepository->>DB: INSERT INTO notifications (...)
            DB-->>NotificationRepository: ok
        end
    end

    BudgetAlertJob-->>Cron: done
```
