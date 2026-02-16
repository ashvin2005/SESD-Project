# ER Diagram

The schema has 10 tables. `users` is the root — everything hangs off it. `transactions` is the central fact table, referencing `categories` and optionally `receipts`. `budgets` can be scoped to a category or applied overall. `recurring_rules` stores cron-like templates that the background job uses to auto-create transactions. `investments` tracks holdings separately from the transaction log. `exchange_rates` is a lookup cache for FX conversion. `notifications` is an in-app message queue.

```mermaid
erDiagram
    users {
        uuid id PK
        string email
        string password_hash
        string name
        string auth_provider
        string google_id
        boolean email_verified
        string base_currency
        string avatar_url
        timestamp created_at
        timestamp updated_at
    }

    user_preferences {
        uuid user_id PK_FK
        boolean notifications_enabled
        boolean email_notifications
        string dashboard_default_range
        string theme
        timestamp updated_at
    }

    categories {
        uuid id PK
        uuid user_id FK
        string name
        string type
        string icon
        string color
        boolean is_default
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    receipts {
        uuid id PK
        uuid user_id FK
        string file_path
        string file_name
        string mime_type
        int file_size
        string thumbnail_path
        timestamp uploaded_at
    }

    transactions {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        uuid receipt_id FK
        string type
        bigint amount
        string currency
        bigint amount_in_base
        decimal exchange_rate
        string description
        text notes
        date transaction_date
        boolean is_recurring
        text_array tags
        string source_hash
        timestamp created_at
        timestamp updated_at
    }

    budgets {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        bigint amount
        string currency
        string period
        date start_date
        int alert_threshold
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        string type
        string title
        text message
        boolean is_read
        jsonb metadata
        timestamp created_at
    }

    exchange_rates {
        int id PK
        string base_currency
        string target_currency
        decimal rate
        timestamp fetched_at
    }

    recurring_rules {
        uuid id PK
        uuid user_id FK
        jsonb template
        string frequency
        date next_occurrence
        date end_date
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    investments {
        uuid id PK
        uuid user_id FK
        string type
        string name
        string symbol
        decimal quantity
        decimal buy_price
        decimal current_price
        string currency
        date investment_date
        text notes
        timestamp created_at
        timestamp updated_at
    }

    users ||--|| user_preferences : "has"
    users ||--o{ categories : "owns"
    users ||--o{ transactions : "records"
    users ||--o{ budgets : "sets"
    users ||--o{ notifications : "receives"
    users ||--o{ receipts : "uploads"
    users ||--o{ recurring_rules : "defines"
    users ||--o{ investments : "tracks"
    categories ||--o{ transactions : "classifies"
    categories ||--o{ budgets : "scopes"
    receipts |o--o{ transactions : "attached to"
```
