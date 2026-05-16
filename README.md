# Payment Provider Backend

## Overview
This is a secure and highly reliable backend system for a payment provider. It allows end-users to register, save their cards (with PCI-DSS compliant simulation), and process payments via an internal mock bank API with sophisticated retry mechanisms and state management.

## Tech Stack
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT (JSON Web Tokens) & Passport
- **Documentation**: Swagger (OpenAPI)
- **Infrastructure**: Docker & Docker Compose (for PostgreSQL)

---

## Architecture

The system is built using a modular architecture to enforce clear separation of concerns:
- **UsersModule**: Handles user entity management and unique email constraints.
- **AuthModule**: Handles secure user registration, password hashing (bcrypt), and JWT issuance/validation.
- *(Upcoming)* **CardsModule**: Will handle card addition, Luhn validation, and secure tokenization.
- *(Upcoming)* **PaymentsModule**: Will manage the transaction state machine and idempotency.
- *(Upcoming)* **MockBankModule**: Internal mock API for simulating bank responses and network latencies.

---

## Database Design

The system uses PostgreSQL with TypeORM. The schema consists of three main tables:

### 1. Users Table (`users`)
Stores the registered users of the system.
- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique)
- `passwordHash` (VARCHAR, stored securely via bcrypt)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

### 2. Cards Table (`cards`)
Stores tokenized and encrypted credit card information for PCI-DSS compliance.
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users)
- `encryptedPan` (VARCHAR, AES-256-GCM encrypted card number)
- `token` (UUID, Unique, the safe token used for payments)
- `last4` (VARCHAR, last 4 digits for UI display)
- `createdAt` (TIMESTAMP)

### 3. Payments Table (`payments`)
Acts as the ledger and state machine for all transactions.
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users)
- `cardToken` (UUID, Foreign Key to Cards.token)
- `amount` (DECIMAL 10,2)
- `idempotencyKey` (VARCHAR, Unique constraint to prevent duplicate charges)
- `status` (ENUM: INITIATED, PROCESSING, AUTHORIZED, CAPTURED, FAILED, RETRYING)
- `durationMs` (INTEGER, execution time for metrics)
- `errorCode` / `errorMessage` (VARCHAR, populated on failure)
- `authorizationCode` (VARCHAR, populated on success)
- `history` (JSONB, audit trail of state changes and retry attempts)
- `createdAt` / `updatedAt` (TIMESTAMP)

---

## Setup & Run Instructions

### Prerequisites
- Node.js (v18+)
- Docker Desktop

### 1. Start the Database (Required on Project Load)
The project includes a `docker-compose.yml` to easily spin up PostgreSQL. **You must run this command every time you load the project or restart your computer** to ensure the database is running before starting the application.
```bash
docker-compose up -d
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (already done if following the guide):
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=payment_db
JWT_SECRET=super-secret-key-change-in-production
PORT=3000
```

### 4. Run the Application
```bash
npm run start:dev
```

### 5. API Documentation & Testing
The application exposes a beautiful Swagger UI to interactively test all APIs.
Once running, navigate to:
**http://localhost:3000/api/docs**

### How to Test the Flow in Swagger:
1. **Register**: Expand `POST /auth/register`. Click "Try it out", enter an email and password, and click Execute.
2. **Login**: Expand `POST /auth/login`. Enter the same credentials and execute. Copy the `access_token` from the response.
3. **Authorize**: Scroll to the very top, click the green **"Authorize"** button, paste your token, and click Authorize.
4. **Add Card**: Expand `POST /cards`. Click "Try it out". 
   - Note: The system enforces **Luhn algorithm validation**, so you must enter a mathematically valid credit card number. Fake/random numbers like `1111222233334444` will result in a `400 Bad Request`.
   - Upon success, the API returns a secure `token` and the `last4` digits. The actual card number is encrypted via AES-256-GCM and stored safely in the database.
5. **Process Payment**: Expand `POST /payments`. Click "Try it out".
   - Paste the `token` you received from Step 4 into the `cardToken` field.
   - Enter an `amount` (e.g., 49.99).
   - Execute! The system will attempt to process the payment through the Mock Bank API. Since it simulates network latency and an 85% success rate, you may notice it taking a second or two. 
   - **Try executing it 10-15 times** to witness the random failures (Insufficient funds, Invalid Card) and the system's **Retry Mechanism** (which handles Rate Limits and Timeouts gracefully in the background using Exponential Backoff)!
6. **Test Idempotency**: In the `POST /payments` endpoint, enter a string into the `Idempotency-Key` header field (e.g., `test-payment-1`). Execute it. Then execute it again with the exact same key. The second request will return instantly without charging the card again!
7. **View Metrics**: Expand `GET /metrics`. Click "Try it out" and execute. You will see a real-time analytics dashboard of total transactions, the simulated bank's success rate, and average processing latency!
8. **Check Terminal Logs**: Switch to your terminal where the NestJS server is running. You will see beautiful, structured JSON logs generated by `nestjs-pino`. Notice how every single log entry has a unique `req.id` (Correlation ID) perfectly tracking each request!
