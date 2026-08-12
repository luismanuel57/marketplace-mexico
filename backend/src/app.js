import express from 'express';
import cors from 'cors';

import pool from './db.js';
import authRutas from './rutas/auth.js';
import articulosRutas from './rutas/articulos.js';
import categoriasRutas from './rutas/categorias.js';
import bolsaRutas from './rutas/bolsa.js';
import ordenesRutas from './rutas/ordenes.js';
import clientesRutas from './rutas/clientes.js';
import domiciliosRutas from './rutas/domicilios.js';

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

app.use('/api/auth', authRutas);
app.use('/api/articulos', articulosRutas);
app.use('/api/categorias', categoriasRutas);
app.use('/api/bolsa', bolsaRutas);
app.use('/api/ordenes', ordenesRutas);
app.use('/api/clientes', clientesRutas);
app.use('/api/domicilios', domiciliosRutas);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

export default app;
