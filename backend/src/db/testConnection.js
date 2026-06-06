// backend/src/db/testConnection.js
import { pool } from "./pool.js";

try {
  const result = await pool.query(`
    SELECT 
      NOW() AS server_time,
      current_database() AS database,
      current_user AS user_name
  `);

  console.log("Verbindung zu PostgreSQL erfolgreich.");
  console.log(result.rows[0]);
} catch (error) {
  console.error("Verbindung zu PostgreSQL fehlgeschlagen:");
  console.error(error.message);
} finally {
  await pool.end();
}
