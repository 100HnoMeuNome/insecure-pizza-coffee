#!/bin/bash

# Cleanup script to remove users created after initial setup
# This keeps only the default admin and user accounts

echo "🧹 Cleaning up user database..."

# Check if MySQL container is running
if ! docker-compose ps mysql | grep -q "Up"; then
    echo "⚠️  MySQL container is not running. Skipping cleanup."
    exit 0
fi

# Get database credentials from environment or use defaults
DB_HOST=${DB_HOST:-mysql}
DB_USER=${DB_USER:-pizzauser}
DB_PASSWORD=${DB_PASSWORD:-pizzapass123}
DB_NAME=${DB_NAME:-pizzacoffee}

# SQL to delete users except default ones
SQL="
DELETE FROM users
WHERE username NOT IN ('admin', 'user');

SELECT CONCAT('✅ Kept ', COUNT(*), ' default users') as result
FROM users;
"

echo "Removing all users except 'admin' and 'user'..."

# Execute cleanup
docker-compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" <<EOF
$SQL
EOF

if [ $? -eq 0 ]; then
    echo "✅ User cleanup completed successfully!"
else
    echo "❌ Error during user cleanup"
    exit 1
fi
