-- ============================================================
-- BASE DE DATOS: FINANZAS PERSONALES
-- ============================================================

CREATE DATABASE finanzas;

USE finanzas;


-- ============================================================
-- TABLA: cat_egresos
-- Descripción:
-- Almacena las categorías utilizadas para clasificar los gastos.
-- Ejemplos: Alimentación, Transporte, Vivienda, Salud, etc.
-- ============================================================

CREATE TABLE cat_egresos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL
) ENGINE=InnoDB;


-- ============================================================
-- TABLA: egresos
-- Descripción:
-- Almacena todos los gastos realizados.
-- Cada egreso pertenece a una categoría de cat_egresos.
--
-- created_at: fecha en que el gasto fue registrado.
-- updated_at: fecha de la última modificación del registro.
-- ============================================================

CREATE TABLE egresos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

    -- Cantidad de dinero gastada
    monto DECIMAL(10,2) NOT NULL,

    -- Descripción o concepto del gasto
    concepto VARCHAR(255) NOT NULL,

    -- Fecha en la que ocurrió el gasto
    fecha DATETIME NOT NULL,

    -- Categoría a la que pertenece el gasto
    id_cat INT NOT NULL,

    -- Fecha en que se registró el gasto
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de la última modificación
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX(id_cat),

    FOREIGN KEY(id_cat)
        REFERENCES cat_egresos(id)
) ENGINE=InnoDB;


-- ============================================================
-- TABLA: limite
-- Descripción:
-- Almacena el límite o presupuesto establecido para cada
-- categoría de egresos durante un determinado mes.
--
-- Ejemplo:
-- Alimentación → Septiembre 2026 → $3,000
--
-- Solo puede existir un límite por categoría en cada mes.
-- ============================================================

CREATE TABLE limite (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

    -- Cantidad máxima establecida para la categoría
    monto DECIMAL(10,2) NOT NULL,

    -- Mes al que corresponde el límite.
    -- Se recomienda utilizar el primer día del mes.
    mes DATE NOT NULL,

    -- Categoría de egreso
    id_cat INT NOT NULL,

    -- Fecha en que se creó el límite
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de la última modificación
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX(id_cat),

    FOREIGN KEY(id_cat)
        REFERENCES cat_egresos(id),

    -- Evita duplicar límites para la misma categoría y mes
    CONSTRAINT unique_limite_categoria_mes
        UNIQUE (id_cat, mes)
) ENGINE=InnoDB;


-- ============================================================
-- TABLA: cat_ingresos
-- Descripción:
-- Almacena las categorías utilizadas para clasificar los ingresos.
-- Ejemplos: Salario, Freelance, Venta, Regalo, etc.
-- ============================================================

CREATE TABLE cat_ingresos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL
) ENGINE=InnoDB;


-- ============================================================
-- TABLA: ingresos
-- Descripción:
-- Almacena todos los ingresos recibidos.
-- Cada ingreso pertenece a una categoría de cat_ingresos.
--
-- created_at: fecha en que se registró el ingreso.
-- updated_at: fecha de la última modificación.
-- ============================================================

CREATE TABLE ingresos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

    -- Cantidad de dinero recibida
    monto DECIMAL(10,2) NOT NULL,

    -- Descripción o concepto del ingreso
    concepto VARCHAR(255) NOT NULL,

    -- Fecha en la que ocurrió el ingreso
    fecha DATETIME NOT NULL,

    -- Categoría a la que pertenece el ingreso
    id_cat INT NOT NULL,

    -- Fecha en que se registró el ingreso
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de la última modificación
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX(id_cat),

    FOREIGN KEY(id_cat)
        REFERENCES cat_ingresos(id)
) ENGINE=InnoDB;


-- ============================================================
-- TABLA: meta_ahorro
-- Descripción:
-- Almacena las metas de ahorro personales.
--
-- Ejemplo:
-- Nombre: Comprar computadora
-- Monto meta: $20,000
-- Saldo actual: $5,000
-- ============================================================

CREATE TABLE meta_ahorro (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

    -- Nombre o descripción de la meta
    nombre VARCHAR(255) NOT NULL,

    -- Cantidad total que se desea alcanzar
    monto_meta DECIMAL(10,2) NOT NULL,

    -- Cantidad acumulada actualmente
    saldo DECIMAL(10,2) NOT NULL,

    -- Fecha en que se creó la meta
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Fecha de la última modificación de la meta
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- ============================================================
-- TABLA: movimiento
-- Descripción:
-- Registra los movimientos de dinero asociados a una meta
-- de ahorro.
--
-- Puede ser:
-- INGRESO → dinero agregado a la meta.
-- EGRESO  → dinero retirado de la meta.
-- ============================================================

CREATE TABLE movimiento (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

    -- Cantidad de dinero del movimiento
    monto DECIMAL(10,2) NOT NULL,

    -- Tipo de movimiento
    tipo ENUM('INGRESO','EGRESO') NOT NULL,

    -- Fecha en la que ocurrió el movimiento
    fecha DATETIME NOT NULL,

    -- Meta de ahorro relacionada
    id_meta INT NOT NULL,

    -- Fecha en que se registró el movimiento
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX(id_meta),

    FOREIGN KEY(id_meta)
        REFERENCES meta_ahorro(id)
) ENGINE=InnoDB;