-- Update script to replace Mocha and Latte with Brazilian coffee varieties
-- Run this if you already have the database initialized

USE pizzacoffee;

-- Delete Mocha and Latte
DELETE FROM products WHERE name IN ('Mocha', 'Latte');

-- Update existing coffee images to use external URLs
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&h=300&fit=crop' WHERE name = 'Espresso';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop' WHERE name = 'Cappuccino';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1495774856032-91b644dd6151?w=400&h=300&fit=crop' WHERE name = 'Americano';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400&h=300&fit=crop' WHERE name = 'Cold Brew';

-- Update pizza images to use external URLs
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop' WHERE name = 'Margherita Pizza';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop' WHERE name = 'Pepperoni Pizza';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop' WHERE name = 'Quattro Formaggi';
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1571407970349-bc81e7e96a47?w=400&h=300&fit=crop' WHERE name = 'Vegetarian Pizza';

-- Add new Brazilian coffee varieties
INSERT INTO products (name, category, description, price, image_url, available) VALUES
('Café Bala de Caramelo', 'coffee', 'Brazilian specialty coffee with caramel notes and sweet flavor', 16.90, 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=400&h=300&fit=crop', TRUE),
('Café Garapa', 'coffee', 'Unique Brazilian coffee with sugarcane sweetness', 15.90, 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400&h=300&fit=crop', TRUE),
('Jacu Bird Coffee', 'coffee', 'Rare Brazilian coffee from beans eaten and excreted by Jacu birds', 89.90, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop', TRUE);

-- Display updated coffee menu
SELECT name, description, price, image_url FROM products WHERE category = 'coffee' ORDER BY price;
