const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { calculate } = require('./src/calculator');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'calculadora_rlc',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 16_384) {
        reject(Object.assign(new Error('El cuerpo de la solicitud es demasiado grande.'), { status: 413 }));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error('El cuerpo debe contener JSON valido.'), { status: 400 }));
      }
    });
    request.on('error', reject);
  });
}

function inputFrom(body) {
  return {
    topologia: body.topologia,
    resistencia: body.resistencia,
    inductancia: body.inductancia,
    capacitancia: body.capacitancia,
    frecuencia: body.frecuencia,
    tension: body.tension,
    angulo: body.angulo
  };
}

async function handleApi(request, response, url) {
  if (request.method === 'POST' && url.pathname === '/api/calculate') {
    const body = await readJson(request);
    try {
      sendJson(response, 200, { resultado: calculate(inputFrom(body)) });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/history') {
    const body = await readJson(request);
    let resultado;
    try {
      resultado = calculate(inputFrom(body));
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    const values = inputFrom(body);
    try {
      const [saved] = await pool.execute(
        `INSERT INTO calculos
          (topologia, resistencia_ohm, inductancia_h, capacitancia_f, frecuencia_hz,
           tension_rms_v, angulo_tension_deg, resultado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          values.topologia,
          values.resistencia,
          values.inductancia,
          values.capacitancia,
          values.frecuencia,
          values.tension,
          values.angulo,
          JSON.stringify(resultado)
        ]
      );
      sendJson(response, 201, { id: saved.insertId });
    } catch (error) {
      console.error('No se pudo guardar el calculo en MySQL:', error.message);
      sendJson(response, 503, { error: 'No se pudo guardar en MySQL. Verifica la conexion y el esquema de la base de datos.' });
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/history') {
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 10, 1), 50);
    try {
      const [rows] = await pool.execute(
        `SELECT id, topologia, resistencia_ohm, inductancia_h, capacitancia_f,
                frecuencia_hz, tension_rms_v, angulo_tension_deg, resultado, creado_en
         FROM calculos ORDER BY creado_en DESC, id DESC LIMIT ?`,
        [limit]
      );
      sendJson(response, 200, { calculos: rows });
    } catch (error) {
      console.error('No se pudo consultar el historial en MySQL:', error.message);
      sendJson(response, 503, { error: 'No se pudo consultar MySQL. Verifica la conexion y el esquema de la base de datos.' });
    }
    return;
  }

  sendJson(response, 404, { error: 'Ruta no encontrada.' });
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    try {
      await handleApi(request, response, url);
    } catch (error) {
      if (!response.headersSent) {
        sendJson(response, error.status || 400, { error: error.message || 'Solicitud invalida.' });
      }
    }
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'Metodo no permitido.' });
    return;
  }

  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.resolve(PUBLIC_DIR, `.${requestedPath}`);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    sendJson(response, 404, { error: 'Archivo no encontrado.' });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(response, error.code === 'ENOENT' ? 404 : 500, { error: 'No se pudo leer el archivo solicitado.' });
      return;
    }
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  });
}

http.createServer(handleRequest).listen(PORT, () => {
  console.log(`Calculadora RLC disponible en http://localhost:${PORT}`);
});
