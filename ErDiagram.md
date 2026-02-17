# ER Diagram

The database has 6 core tables. `users` holds accounts and wallet balance. `stocks` holds simulated market data. `trades` is an immutable log of every buy/sell. `portfolio` tracks live holdings per user per stock (upserted on every trade). `stock_prices` stores historical snapshots for charts. `analytics` is a computed summary per user, refreshed after trades.

```mermaid
erDiagram
    users {
        int id PK
        string username
        string email
        string password_hash
        decimal wallet_balance
        timestamp registered_at
        timestamp created_at
        timestamp updated_at
    }

    stocks {
        int id PK
        string symbol
        string company_name
        string sector
        decimal current_price
        decimal opening_price
        decimal day_high
        decimal day_low
        bigint volume
        string market_status
        timestamp created_at
        timestamp updated_at
    }

    trades {
        int id PK
        int user_id FK
        int stock_id FK
        string trade_type
        int quantity
        decimal price_per_unit
        decimal total_amount
        timestamp executed_at
        timestamp created_at
    }

    portfolio {
        int id PK
        int user_id FK
        int stock_id FK
        int quantity
        decimal avg_buy_price
        timestamp created_at
        timestamp updated_at
    }

    stock_prices {
        int id PK
        int stock_id FK
        decimal price
        timestamp recorded_at
    }

    analytics {
        int id PK
        int user_id FK
        string risk_level
        decimal diversification_score
        int total_trades
        int winning_trades
        int losing_trades
        decimal win_rate
        decimal total_profit_loss
        text insights
        timestamp updated_at
    }

    users ||--o{ trades : "places"
    stocks ||--o{ trades : "involved in"
    users ||--o{ portfolio : "holds"
    stocks ||--o{ portfolio : "held via"
    stocks ||--o{ stock_prices : "has history"
    users ||--|| analytics : "has"
```
