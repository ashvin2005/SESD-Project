# Sequence Diagram

The most critical backend flow in TradeLearn is when a user buys a stock. This involves JWT auth at the controller, balance + holdings validation in the service layer, a transactional write across three tables (trades, portfolio, users), and a structured response back to the client.

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant TradeController
    participant TradeService
    participant StockService
    participant UserService
    participant PortfolioService
    participant TradeRepository
    participant PortfolioRepository
    participant UserRepository
    participant DB as Database

    User->>Client: Click "Buy" (stockId, quantity)
    Client->>TradeController: POST /api/trades/buy (JWT + body)

    TradeController->>TradeController: validateJWT(token)
    TradeController->>TradeService: executeBuyOrder(userId, stockId, quantity)

    TradeService->>StockService: getStockById(stockId)
    StockService->>DB: SELECT * FROM stocks WHERE id = stockId
    DB-->>StockService: stock row
    StockService-->>TradeService: Stock (currentPrice)

    TradeService->>TradeService: totalCost = quantity * currentPrice

    TradeService->>UserService: getWalletBalance(userId)
    UserService->>UserRepository: findById(userId)
    UserRepository->>DB: SELECT wallet_balance FROM users WHERE id = userId
    DB-->>UserRepository: user row
    UserRepository-->>UserService: User
    UserService-->>TradeService: walletBalance

    alt walletBalance < totalCost
        TradeService-->>TradeController: Error: Insufficient Balance
        TradeController-->>Client: 400 Bad Request
        Client-->>User: Show error message
    else walletBalance >= totalCost
        TradeService->>TradeRepository: save(Trade)
        TradeRepository->>DB: INSERT INTO trades (user_id, stock_id, type, quantity, price_per_unit, total_amount)
        DB-->>TradeRepository: saved trade

        TradeService->>UserService: deductBalance(userId, totalCost)
        UserService->>UserRepository: updateBalance(userId, newBalance)
        UserRepository->>DB: UPDATE users SET wallet_balance = newBalance WHERE id = userId
        DB-->>UserRepository: updated

        TradeService->>PortfolioService: upsertHolding(userId, stockId, quantity, currentPrice)
        PortfolioService->>PortfolioRepository: findByUserAndStock(userId, stockId)
        PortfolioRepository->>DB: SELECT * FROM portfolio WHERE user_id = userId AND stock_id = stockId
        DB-->>PortfolioRepository: holding or null

        alt Holding exists
            PortfolioService->>PortfolioService: recalculate avgBuyPrice and quantity
            PortfolioService->>PortfolioRepository: update(holding)
            PortfolioRepository->>DB: UPDATE portfolio SET quantity, avg_buy_price WHERE id = holdingId
        else No holding
            PortfolioService->>PortfolioRepository: save(newHolding)
            PortfolioRepository->>DB: INSERT INTO portfolio (user_id, stock_id, quantity, avg_buy_price)
        end

        DB-->>PortfolioRepository: done
        PortfolioRepository-->>PortfolioService: updated holding
        PortfolioService-->>TradeService: ok

        TradeService-->>TradeController: TradeResult (tradeId, newBalance, holding)
        TradeController-->>Client: 200 OK (tradeId, stock, quantity, price, newBalance)
        Client-->>User: "Bought successfully"
    end
```

## Alternate Flows

### Alternate Flow 1: Stock Not Found
- **Condition**: Invalid stockId provided
- **Flow**: 
  1. StockService returns null
  2. TradeService throws StockNotFoundException
  3. Controller returns 404 Not Found
  4. User sees "Stock not found" error

### Alternate Flow 2: Insufficient Balance
- **Condition**: User's wallet balance < total cost
- **Flow**:
  1. Validation fails at TradeService
  2. Controller returns 400 Bad Request
  3. User sees "Insufficient balance" error

### Alternate Flow 3: Invalid Quantity
- **Condition**: Quantity <= 0 or not a valid number
- **Flow**:
  1. Frontend validation catches error
  2. If bypassed, TradeService validates
  3. Returns 400 Bad Request
  4. User sees "Invalid quantity" error

### Alternate Flow 4: Market Closed
- **Condition**: Trading outside market hours
- **Flow**:
  1. TradeService checks market status
  2. Returns "Market is closed" error
  3. Trade is not executed

## Key Points

### Transaction Management:
- All database operations (deduct balance, save trade, update portfolio) should be wrapped in a **database transaction**
- If any operation fails, the entire transaction should be rolled back
- Ensures data consistency (ACID properties)

### Concurrency Handling:
- Stock prices may change during transaction
- Use optimistic locking or pessimistic locking
- Capture price at time of validation

### Performance Considerations:
- Multiple database queries can be optimized
- Consider caching stock prices
- Use database indexes on user_id, stock_id

### Security:
- JWT token validation at controller level
- Prevent users from buying stocks for other users
- Sanitize and validate all inputs

---

*This sequence diagram demonstrates the complete interaction flow for a stock purchase, showing proper layering, validation, and data persistence in the TradeLearn platform.*
