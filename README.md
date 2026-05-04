Qué se edita en Supabase:
- public.guide_catalog: title, description, local_file_path, cover_image_path, sort_order, status.
- public.committees: name, description, image_path, image_alt, sort_order, status.
- public.committee_members: integrantes.
- public.news: noticias.
- public.trainings: capacitaciones.
- public.committee_resources: recursos digitales.

Qué se edita localmente solo cuando cambia un archivo físico:
- /guias/*.pdf
- /assets/guias/*.png
- /assets/comites/*.jpg o *.png

Regla práctica:
Si cambia el texto o una ruta visible, edita Supabase.
Si cambia el archivo físico, reemplaza el archivo en la carpeta correspondiente y verifica que la ruta guardada en Supabase coincida exactamente.
