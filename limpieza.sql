-- SigueFit - Limpieza de datos en Supabase para Producción

-- 1. Eliminar reservas y clases (datos de prueba)
DELETE FROM reservas;
DELETE FROM clases;

-- 2. Eliminar usuarios de prueba (mantener únicamente al admin)
DELETE FROM usuarios WHERE rol != 'admin';

-- 3. Asegurar que el usuario admin inicial exista y tenga 0 créditos
-- (Asume id 1 para empatar con la inicialización en caso de tabla vacía)
INSERT INTO usuarios (id, studio_id, nombre, email, password, rol, creditos, activo)
SELECT 1, 1, 'Admin Studio', 'admin@siguefit.com', 'admin123', 'admin', 0, true
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE rol = 'admin');

-- 4. Por seguridad, forzar actualización del admin a las credenciales por defecto (en caso de que estuviera modificado)
UPDATE usuarios 
SET creditos = 0, password = 'admin123', email = 'admin@siguefit.com'
WHERE rol = 'admin';
