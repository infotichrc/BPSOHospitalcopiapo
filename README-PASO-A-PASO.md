# BPSO Hospital Copiapó - Guía paso a paso

## 1) Qué incluye esta base
- `index.html`: estructura del sitio
- `styles.css`: diseño, animaciones y responsive
- `app.js`: conexión con Supabase, carga pública, login admin y CRUD básico
- `supabase-setup.sql`: script inicial para crear tablas y políticas

## 2) Crear tablas en Supabase
1. Entra a tu proyecto `RNAOHRC`.
2. Abre **SQL Editor**.
3. Copia y ejecuta el contenido de `supabase-setup.sql`.
4. Verifica que existan las tablas:
   - `news`
   - `trainings`
   - `guides`

## 3) Crear usuario administrador
1. Ve a **Authentication** > **Users**.
2. Selecciona **Create user**.
3. Crea un correo administrador y una contraseña.
4. Ese correo y contraseña son los que usarás en el panel “Admin” del sitio.

## 4) Obtener URL y key pública
1. Ve a **Project Settings**.
2. Busca la sección **Data API**.
3. Copia:
   - Project URL
   - Publishable key (o anon key si tu proyecto aún usa ese nombre)
4. Abre `app.js`.
5. Reemplaza:
   - `REEMPLAZA_CON_TU_PROJECT_URL`
   - `REEMPLAZA_CON_TU_ANON_KEY`

## 5) Probar localmente
Abre la carpeta en VS Code y usa Live Server, o cualquier servidor estático.
No pruebes con doble clic si el navegador bloquea módulos externos.

## 6) Subir a GitHub Pages
1. Crea un repositorio nuevo, por ejemplo `bpso-site`.
2. Sube estos archivos al repositorio.
3. En GitHub entra a **Settings** > **Pages**.
4. En **Build and deployment**, elige:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/root**
5. Guarda.
6. GitHub publicará el sitio.

## 7) Dominio temporal
Puedes usar primero algo como:
- `tuusuario.github.io/bpso-site`

Y luego, cuando den luz verde, moverlo a un subdominio institucional como:
- `bpso.hospitalcopiapo.cl`

## 8) Cómo manejar imágenes y PDF correctamente
### Opción rápida
- Sube la imagen o PDF a un bucket público de Supabase.
- Copia la URL pública.
- Pégala en el panel admin.

### Buckets sugeridos
- `bpso-images`
- `bpso-guides`

## 9) Cómo subir archivos a Supabase Storage
1. Entra a **Storage**.
2. Crea el bucket `bpso-images` y/o `bpso-guides`.
3. Déjalo como público si quieres usar enlaces directos sencillos.
4. Sube tu archivo.
5. Copia la **Public URL**.
6. Usa esa URL en la noticia, capacitación o guía.

## 10) Qué hace el panel admin actual
- Login con Supabase Auth
- Crear noticia
- Crear capacitación
- Crear guía descargable
- Eliminar registros
- Mostrar cambios reflejados en la página

## 11) Qué mejoraría en una segunda etapa
- Editor rico (texto con formato)
- Subida directa de imágenes/PDF desde el panel sin copiar URL manual
- Modal detalle para noticias
- Buscador y filtros
- Roles más estrictos para que no cualquier usuario autenticado administre
- Auditoría de quién publicó cada contenido

## 12) Recomendación importante
No uses jamás la `service_role key` en `app.js`.
Solo usa la clave pública/publishable.
