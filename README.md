# Calculadora R-L-C

Aplicacion web en espanol para analizar un circuito con una resistencia, una inductancia y una capacitancia, conectadas en serie o en paralelo. Calcula la corriente total, las corrientes y tensiones de cada elemento, y la impedancia equivalente en forma rectangular y polar. Cada analisis se guarda en una base de datos MySQL.

## Requisitos

- Node.js 18 o posterior
- MySQL 8 o compatible

## Preparacion

### Con Docker

Requiere Docker con el plugin Docker Compose. Desde la raiz del proyecto:

```sh
docker compose up --build
```

La aplicacion queda disponible en <http://localhost:3000>. Compose inicia MySQL,
crea el esquema desde `schema.sql` en la primera ejecucion y mantiene los datos
en el volumen `mysql_data`. Para detener los contenedores, usa `Ctrl+C` y luego
`docker compose down`; para borrar tambien los datos de MySQL, ejecuta
`docker compose down -v`.

Los valores de base de datos predeterminados son solo para desarrollo local.
Antes de publicar el servicio, define `DB_PASSWORD` y `MYSQL_ROOT_PASSWORD` con
valores seguros en el entorno donde ejecutes Compose.

### Sin Docker

1. Crea las tablas ejecutando el archivo `schema.sql` con una cuenta MySQL que pueda crear la base de datos:

   ```sh
   mysql -u root -p < schema.sql
   ```

2. Instala las dependencias e inicia la aplicacion:

   ```sh
   npm install
   DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=root DB_PASSWORD=tu_clave npm start
   ```

   La aplicacion queda disponible en <http://localhost:3000>. La conexion tambien admite `DB_NAME` (por defecto `calculadora_rlc`) y `PORT` (por defecto `3000`).

## Convenciones

- La tension ingresada es el valor eficaz (RMS), en voltios, con un angulo en grados.
- La frecuencia se ingresa en Hz; resistencia en Ω, inductancia en H y capacitancia en F.
- El angulo de la fuente puede ser positivo o negativo.
- La frecuencia es necesaria para calcular las reactancias: `XL = 2πfL` y `XC = 1/(2πfC)`.
- Se muestran fasores rectangulares y polares para la fuente y para cada componente. En serie, las corrientes de los componentes coinciden y sus tensiones son diferentes; en paralelo, las tensiones coinciden y las corrientes son diferentes.
- La calculadora mantiene disponibles los resultados aunque MySQL no pueda guardar el calculo; la interfaz informa del error de persistencia. El historial requiere que MySQL este en ejecucion y que el esquema este creado.

## Pruebas

```sh
npm test
```
