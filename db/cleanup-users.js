const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function cleanupUsers() {
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

    console.log('🔌 Connected to MySQL database');
    console.log('━'.repeat(60));

    // Read and execute cleanup script
    const cleanupScript = fs.readFileSync(path.join(__dirname, 'cleanup-users.sql'), 'utf8');
    const [results] = await connection.query(cleanupScript);

    // Parse results
    let usersBefore = [];
    let usersAfter = [];
    let summary = '';

    if (Array.isArray(results)) {
      results.forEach(result => {
        if (Array.isArray(result) && result.length > 0) {
          if (result[0].info && result[0].info.includes('before')) {
            // Skip info message
          } else if (result[0].info && result[0].info.includes('after')) {
            // Skip info message
          } else if (result[0].summary) {
            summary = result[0].summary;
          } else if (result[0].username) {
            if (!usersAfter.length && !summary) {
              usersBefore = result;
            } else {
              usersAfter = result;
            }
          }
        }
      });
    }

    console.log('\n📋 Users before cleanup:');
    if (usersBefore.length > 0) {
      usersBefore.forEach(user => {
        const adminBadge = user.is_admin ? '👑' : '👤';
        console.log(`  ${adminBadge} ${user.username.padEnd(15)} (ID: ${user.id}) - ${user.email || 'No email'}`);
      });
    }

    console.log('\n🗑️  Removing non-default users...');
    console.log('   Keeping: admin, user');

    console.log('\n✅ Users after cleanup:');
    if (usersAfter.length > 0) {
      usersAfter.forEach(user => {
        const adminBadge = user.is_admin ? '👑' : '👤';
        console.log(`  ${adminBadge} ${user.username.padEnd(15)} (ID: ${user.id}) - ${user.email || 'No email'}`);
      });
    }

    if (summary) {
      console.log('\n' + '━'.repeat(60));
      console.log(`✅ ${summary}`);
    }

    console.log('━'.repeat(60));
    console.log('\n✨ User cleanup completed successfully!\n');

  } catch (error) {
    console.error('❌ Error during user cleanup:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Make sure the database is running:');
      console.error('   docker-compose up -d mysql');
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

cleanupUsers();
