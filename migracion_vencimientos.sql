-- ========================================================
-- Migración: Vencimiento de Créditos
-- ========================================================

-- Agregar campo para la fecha de vencimiento en usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_vencimiento TIMESTAMP WITH TIME ZONE;
