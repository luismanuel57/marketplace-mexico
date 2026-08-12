import express from 'express';
import cors from 'cors';

import pool from './db.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/estado', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT NOW() AS hora_servidor');
    res.json({
      ok: true,
      mensaje: 'Backend conectado a PostgreSQL',
      horaServidor: resultado.rows[0].hora_servidor,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default app;
