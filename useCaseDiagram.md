# Use Case Diagram

TradeLearn lets users practice stock trading using virtual money in a simulated market. Users can register, trade stocks, track their portfolio, and view learning analytics — all without any real financial risk. The system also includes an internal market engine that updates stock prices automatically.

## Actors

- **Guest** — Can register or log in to access the platform
- **Authenticated User** — Core actor; can trade, view portfolio, check analytics, and compete on the leaderboard
- **Market Engine (System)** — Internal automated actor; periodically updates stock prices

## Use Cases by Actor

**Guest:**
- Register account
- Login

**Authenticated User:**
- View available stocks and current prices
- Buy stock
- Sell stock
- View transaction history
- View portfolio (holdings, avg buy price, P&L)
- View learning analytics (risk score, diversification, win rate)
- View leaderboard

**Market Engine (System):**
- Simulate and update stock prices
- Save price to history

```mermaid
graph TD
    Guest([Guest])
    User([Authenticated User])
    Engine([Market Engine])

    subgraph TradeLearn Platform
        UC1[Register]
        UC2[Login]
        UC3[View Stocks]
        UC4[Buy Stock]
        UC5[Sell Stock]
        UC6[View Transaction History]
        UC7[View Portfolio]
        UC8[View Analytics]
        UC9[View Leaderboard]
        UC10[Simulate Stock Prices]
        UC11[Save Price History]
    end

    Guest --> UC1
    Guest --> UC2

    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9

    Engine --> UC10
    Engine --> UC11

    UC4 -->|includes| UC3
    UC5 -->|includes| UC7
    UC8 -->|extends| UC7
```
