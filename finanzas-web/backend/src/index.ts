import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './bd';
import apiRoutes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API de Finanzas funcionando 🚀' });
});

// Iniciar servidor verificando la conexión a MySQL
pool.getConnection()
    .then((conn) => {
        conn.release();
        console.log('✅ Conexión a MySQL establecida correctamente');
        app.listen(PORT, () => {
            console.log(`Backend de Finanzas corriendo en http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ No se pudo conectar a MySQL:', err.message);
        process.exit(1);
    });
