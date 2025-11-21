-- Cleanup script to remove users created after initial setup
-- Keeps only the default admin and user accounts
-- Also removes their associated orders, payments, etc.

USE pizzacoffee;

-- Show users before cleanup
SELECT '📋 Users before cleanup:' as info;
SELECT id, username, email, is_admin, created_at FROM users ORDER BY id;

-- Get IDs of users to delete (all except admin and user)
SET @users_to_delete = (
    SELECT GROUP_CONCAT(id)
    FROM users
    WHERE username NOT IN ('admin', 'user')
);

-- Delete payment transactions for orders belonging to users to be deleted
DELETE pt FROM payment_transactions pt
INNER JOIN orders o ON pt.order_id = o.id
WHERE o.user_id IN (
    SELECT id FROM users WHERE username NOT IN ('admin', 'user')
);

-- Delete order items for orders belonging to users to be deleted
DELETE oi FROM order_items oi
INNER JOIN orders o ON oi.order_id = o.id
WHERE o.user_id IN (
    SELECT id FROM users WHERE username NOT IN ('admin', 'user')
);

-- Delete orders for users to be deleted
DELETE FROM orders
WHERE user_id IN (
    SELECT id FROM users WHERE username NOT IN ('admin', 'user')
);

-- Delete all users except default ones
DELETE FROM users
WHERE username NOT IN ('admin', 'user');

-- Show users after cleanup
SELECT '✅ Users after cleanup:' as info;
SELECT id, username, email, is_admin, created_at FROM users ORDER BY id;

-- Show summary
SELECT CONCAT('Kept ', COUNT(*), ' default users (admin, user)') as summary
FROM users;
