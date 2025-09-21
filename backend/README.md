# LTS Portal Backend

Backend API for the LTS Portal application with PostgreSQL database and JWT authentication.

## Setup Instructions

### 1. Database Setup

1. **Create PostgreSQL Database:**
   ```sql
   CREATE DATABASE lts_portal;
   ```

2. **Update Environment Variables:**
   Edit `.env` file with your PostgreSQL credentials:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=lts_portal
   DB_USER=postgres
   DB_PASSWORD=your_actual_password
   JWT_SECRET=your_jwt_secret_key
   ```

3. **Run Database Setup:**
   ```bash
   npm run build
   node dist/database/setup.js
   ```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The server will start on port 5000.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Health Check
- `GET /api/health` - Server health status

## User Account

The database setup creates this user account:
- Admin: `matthewmukasa0@gmail.com` (password: `1100211Matt.`)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | lts_portal |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | (required) |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRES_IN` | Token expiration | 24h |
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
