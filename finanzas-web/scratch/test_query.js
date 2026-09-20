// scratch/test_query.js
const { pool } = require('../backend/dist/bd.js');

async function test() {
    try {
        const [rows] = await pool.query(`
            WITH mov_con_saldo AS (
                SELECT 
                    mov.id,
                    CAST(mov.monto AS DOUBLE) AS monto,
                    mov.tipo,
                    mov.fecha,
                    mov.id_meta,
                    mov.created_at,
                    m.nombre AS nombre_meta,
                    CAST(m.monto_meta AS DOUBLE) AS monto_meta,
                    CAST(m.saldo AS DOUBLE) AS saldo_meta,
                    CAST(
                        SUM(CASE WHEN mov.tipo = 'INGRESO' THEN mov.monto ELSE -mov.monto END)
                        OVER (PARTITION BY mov.id_meta ORDER BY mov.fecha ASC, mov.id ASC)
                    AS DOUBLE) AS saldo_resultante
                FROM movimiento mov
                INNER JOIN meta_ahorro m ON m.id = mov.id_meta
            )
            SELECT * FROM mov_con_saldo
            ORDER BY fecha DESC, id DESC
            LIMIT 5
        `);
        console.log('CTE query success! Rows:', rows);
    } catch (err) {
        console.error('CTE query error:', err.message);
    } finally {
        await pool.end();
    }
}
test();
