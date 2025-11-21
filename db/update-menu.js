const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function updateMenu() {
  let connection;

  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'pizzauser',
      password: process.env.DB_PASSWORD || 'pizzapass123',
      database: process.env.DB_NAME || 'pizzacoffee',
      multipleStatements: true
    });

    console.log('Connected to MySQL database');

    // Read and execute update script
    const updateScript = fs.readFileSync(path.join(__dirname, 'update-coffee-menu.sql'), 'utf8');
    const [results] = await connection.query(updateScript);

    console.log('✅ Coffee menu updated successfully!');
    console.log('\n📋 Updated Coffee Menu:');
    console.log('━'.repeat(80));

    // Display the updated menu (last result from the query)
    const menuResults = Array.isArray(results) ? results[results.length - 1] : results;
    if (Array.isArray(menuResults)) {
      menuResults.forEach(item => {
        console.log(`${item.name.padEnd(25)} - R$ ${item.price.toString().padStart(6)}`);
        console.log(`  ${item.description}`);
        console.log(`  🖼️  ${item.image_url}`);
        console.log();
      });
    }

    console.log('━'.repeat(80));
    console.log('\n✨ Changes made:');
    console.log('  ❌ Removed: Mocha, Latte');
    console.log('  ✅ Added: Café Bala de Caramelo, Café Garapa, Jacu Bird Coffee');
    console.log('  🖼️  Updated all product images to use external URLs');

  } catch (error) {
    console.error('❌ Error updating menu:', error.message);
    console.error('\nIf the database doesn\'t exist yet, run: npm run init-db');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateMenu();
