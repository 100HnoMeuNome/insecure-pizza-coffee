-- Create database
CREATE DATABASE IF NOT EXISTS pizzacoffee;
USE pizzacoffee;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  full_name VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category ENUM('pizza', 'coffee', 'drink', 'dessert') NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(255),
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled') DEFAULT 'pending',
  delivery_address TEXT NOT NULL,
  delivery_phone VARCHAR(20),
  payment_method ENUM('credit_card', 'pix') NOT NULL,
  payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  payment_method ENUM('credit_card', 'pix') NOT NULL,
  card_number VARCHAR(255),
  card_holder VARCHAR(100),
  cvv VARCHAR(10),
  pix_key VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample products
INSERT INTO products (name, category, description, price, image_url) VALUES
('Margherita Pizza', 'pizza', 'Classic pizza with tomato, mozzarella, and basil', 35.90, 'https://images.pexels.com/photos/905847/pexels-photo-905847.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Pepperoni Pizza', 'pizza', 'Pizza with pepperoni, mozzarella, and tomato sauce', 42.90, 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Quattro Formaggi', 'pizza', 'Four cheese pizza: mozzarella, gorgonzola, parmesan, provolone', 45.90, 'https://images.pexels.com/photos/803290/pexels-photo-803290.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Vegetarian Pizza', 'pizza', 'Pizza with fresh vegetables, mushrooms, and olives', 38.90, 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Espresso', 'coffee', 'Strong Italian espresso coffee', 8.90, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Cappuccino', 'coffee', 'Espresso with steamed milk and foam', 12.90, 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Café Bala de Caramelo', 'coffee', 'Brazilian specialty coffee with caramel notes and sweet flavor - 250g package', 16.90, 'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Café Garapa', 'coffee', 'Unique Brazilian coffee with sugarcane sweetness - 250g package', 15.90, 'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Jacu Bird Coffee', 'coffee', 'Rare Brazilian coffee from beans eaten and excreted by Jacu birds - 250g package', 89.90, 'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=400');

-- Create admin user (password: admin123)
-- Note: This is intentionally using MD5 (extremely weak and deprecated)
-- MD5 hash of 'admin123' = 0192023a7bbd73250516f069df18b500
INSERT INTO users (username, password, email, full_name, is_admin) VALUES
('admin', '0192023a7bbd73250516f069df18b500', 'admin@pizzacoffee.com', 'Administrator', TRUE),
('user', '5f4dcc3b5aa765d61d8327deb882cf99', 'user@pizzacoffee.com', 'Test User', FALSE);
