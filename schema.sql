CREATE DATABASE IF NOT EXISTS calculadora_rlc
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE calculadora_rlc;

CREATE TABLE IF NOT EXISTS calculos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  topologia ENUM('serie', 'paralelo') NOT NULL,
  resistencia_ohm DOUBLE NOT NULL,
  inductancia_h DOUBLE NOT NULL,
  capacitancia_f DOUBLE NOT NULL,
  frecuencia_hz DOUBLE NOT NULL,
  tension_rms_v DOUBLE NOT NULL,
  angulo_tension_deg DOUBLE NOT NULL,
  resultado JSON NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_calculos_creado_en (creado_en)
);
