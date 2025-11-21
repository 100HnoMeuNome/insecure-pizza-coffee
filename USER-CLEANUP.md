# User Cleanup Documentation

## Overview

During security testing and demonstrations, many test user accounts may be created. This documentation explains how to clean up test users while preserving the default admin and user accounts.

## What Gets Cleaned Up

The cleanup process removes:
- ✅ All user accounts except `admin` and `user`
- ✅ Orders associated with deleted users
- ✅ Order items from those orders
- ✅ Payment transactions for those orders

## What's Preserved

The cleanup keeps:
- ✅ Default `admin` account (username: admin, password: admin123)
- ✅ Default `user` account (username: user, password: password)
- ✅ All product data (pizzas, coffees)
- ✅ Database schema and structure

## Cleanup Methods

### Method 1: NPM Script (Recommended)

```bash
npm run cleanup-users
```

**Output:**
- Shows users before cleanup
- Removes non-default users and their data
- Shows users after cleanup
- Displays summary

**Example:**
```
🔌 Connected to MySQL database
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Users before cleanup:
  👑 admin           (ID: 1) - admin@pizzacoffee.com
  👤 user            (ID: 2) - user@pizzacoffee.com
  👤 testuser1       (ID: 3) - test1@test.com
  👤 testuser2       (ID: 4) - test2@test.com

🗑️  Removing non-default users...
   Keeping: admin, user

✅ Users after cleanup:
  👑 admin           (ID: 1) - admin@pizzacoffee.com
  👤 user            (ID: 2) - user@pizzacoffee.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Kept 2 default users (admin, user)
```

### Method 2: Shell Script

```bash
./scripts/cleanup-users.sh
```

This method:
- Checks if MySQL container is running
- Uses environment variables for database credentials
- Executes cleanup SQL
- Shows confirmation message

### Method 3: Docker Compose Down (Automatic)

```bash
./docker-down.sh
```

This wrapper script:
1. **Cleans up users first** (automatic)
2. Stops Docker containers
3. Optionally removes volumes

**Options:**
```bash
# Stop with cleanup (default)
./docker-down.sh

# Stop with cleanup and remove volumes
./docker-down.sh -v

# Stop without cleanup
./docker-down.sh --skip-cleanup
```

### Method 4: Direct SQL

```bash
docker-compose exec mysql mysql -u pizzauser -p pizzacoffee < db/cleanup-users.sql
```

Or connect to MySQL directly:
```bash
docker-compose exec -it mysql mysql -u pizzauser -p pizzacoffee
```

Then run:
```sql
source /docker-entrypoint-initdb.d/cleanup-users.sql
```

## When to Use Cleanup

### Recommended Times:
- ✅ After security testing sessions
- ✅ Before demonstrations
- ✅ After training workshops
- ✅ When restarting fresh tests
- ✅ Before shutting down the application

### Not Recommended:
- ❌ During active testing
- ❌ While users are logged in
- ❌ In the middle of transactions

## Cleanup Process Details

The cleanup script performs these operations in order:

1. **Query Current Users**
   ```sql
   SELECT id, username, email, is_admin FROM users;
   ```

2. **Delete Payment Transactions**
   ```sql
   DELETE FROM payment_transactions
   WHERE order_id IN (
     SELECT id FROM orders
     WHERE user_id IN (SELECT id FROM users WHERE username NOT IN ('admin', 'user'))
   );
   ```

3. **Delete Order Items**
   ```sql
   DELETE FROM order_items
   WHERE order_id IN (
     SELECT id FROM orders
     WHERE user_id IN (SELECT id FROM users WHERE username NOT IN ('admin', 'user'))
   );
   ```

4. **Delete Orders**
   ```sql
   DELETE FROM orders
   WHERE user_id IN (SELECT id FROM users WHERE username NOT IN ('admin', 'user'));
   ```

5. **Delete Users**
   ```sql
   DELETE FROM users WHERE username NOT IN ('admin', 'user');
   ```

6. **Verify Results**
   ```sql
   SELECT COUNT(*) FROM users; -- Should return 2
   ```

## Foreign Key Constraints

The cleanup respects foreign key constraints by deleting in this order:
1. Payment transactions (child of orders)
2. Order items (child of orders)
3. Orders (child of users)
4. Users (parent)

This prevents foreign key constraint violations.

## Troubleshooting

### Error: Connection Refused
```
❌ Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solution:** Start the database first
```bash
docker-compose up -d mysql
# Wait a few seconds for MySQL to be ready
npm run cleanup-users
```

### Error: Access Denied
```
❌ Error: Access denied for user 'pizzauser'@'localhost'
```

**Solution:** Check your `.env` file for correct credentials
```bash
DB_USER=pizzauser
DB_PASSWORD=pizzapass123
DB_NAME=pizzacoffee
```

### Error: Database Doesn't Exist
```
❌ Error: Unknown database 'pizzacoffee'
```

**Solution:** Initialize the database first
```bash
npm run init-db
```

### Cleanup Not Removing Users

**Check if users are truly extra:**
```bash
docker-compose exec mysql mysql -u pizzauser -ppizzapass123 pizzacoffee -e "SELECT username FROM users;"
```

**Verify cleanup script ran:**
```bash
npm run cleanup-users
```

## Automated Cleanup on Docker Down

The `./docker-down.sh` script automatically cleans up users before stopping containers.

**How it works:**
1. Script detects if MySQL container is running
2. Runs cleanup SQL if container is up
3. Proceeds with `docker-compose down`
4. Shows summary of actions taken

**Disable automatic cleanup:**
```bash
./docker-down.sh --skip-cleanup
```

## Complete Cleanup (Reset Everything)

To completely reset the application and all data:

```bash
# Stop and remove all containers and volumes
./docker-down.sh -v

# Or
docker-compose down -v

# Then reinitialize
docker-compose up -d
npm run init-db
```

This will:
- ❌ Delete all users (including test users)
- ❌ Delete all orders
- ❌ Delete all payment data
- ✅ Fresh database with only default admin and user

## Integration with CI/CD

For automated testing environments:

```bash
#!/bin/bash
# test-setup.sh

# Start application
docker-compose up -d

# Wait for services
sleep 10

# Run tests
npm test

# Cleanup before shutdown
npm run cleanup-users

# Stop containers
docker-compose down
```

## NPM Scripts Summary

| Command | Description |
|---------|-------------|
| `npm run cleanup-users` | Clean up test users |
| `npm run init-db` | Initialize fresh database |
| `npm run update-menu` | Update coffee menu |
| `npm start` | Start application |

## Shell Scripts Summary

| Script | Description |
|--------|-------------|
| `./docker-down.sh` | Stop containers with cleanup |
| `./docker-down.sh -v` | Stop and remove volumes |
| `./docker-down.sh --skip-cleanup` | Stop without cleanup |
| `./scripts/cleanup-users.sh` | Cleanup users only |

## SQL Files

| File | Purpose |
|------|---------|
| `db/cleanup-users.sql` | SQL cleanup script |
| `db/schema.sql` | Database schema with default users |
| `db/update-coffee-menu.sql` | Menu update script |

---

**Best Practice:** Run `npm run cleanup-users` before demonstrations and after testing sessions to maintain a clean database state! 🧹
