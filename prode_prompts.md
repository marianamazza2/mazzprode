Paso 1 — Setup

Creá un proyecto Vite + React 18 llamado mazzprode. Instalá y configurá 
Tailwind CSS, react-router-dom, @supabase/supabase-js y html-to-image. 
Creá src/lib/supabase.js que lea VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY 
del .env. Configurá el router con rutas vacías: "/", "/jugar", "/ranking", 
"/admin". Confirmá que arranca sin errores. Nada más por ahora.

Paso 2 — Base de datos

Generá solo el SQL para Supabase (Postgres), en un archivo schema.sql:
- teams: id, name, code, flag_emoji, group_name
- participants: id (uuid), name, instagram, email (unique), has_business 
  (bool), business_name, consent (bool), created_at
- predictions: id, participant_id (fk unique), champion_id, runner_up_id, 
  semifinal_3_id, semifinal_4_id, final_goals, points (default 0)
- results: fila única id=1 con semifinalists (int[]), runner_up_id, 
  champion_id, final_goals, locked (bool)
Incluí un INSERT con las 48 selecciones del Mundial 2026 (nombre, código, 
emoji de bandera). Solo el SQL, no toques el front.

Paso 3 — Captura + pronóstico (el corazón)
Construí la página "/jugar": un LeadForm (nombre, instagram, email, "¿tenés 
negocio? ¿cuál?", checkbox de consentimiento RGPD obligatorio) seguido de un 
PredictionForm con 5 campos: campeón, subcampeón, semifinalista 3, 
semifinalista 4 (dropdowns con bandera+nombre desde teams), y goles en la 
final. Al enviar, guarda participant + prediction en Supabase. Si la fecha 
actual es posterior a 2026-06-28, mostrá el form en solo-lectura con un 
cartel "Pronósticos cerrados". Mobile-first.

Paso 3 BIS:
En /jugar, en vez de insertar participant y luego prediction por separado con
limpieza manual del huérfano, creá una función de Postgres "submit_entry" que
haga los dos inserts en una sola transacción (si falla cualquiera, no queda
nada). Agregala al schema.sql. Otorgá EXECUTE a anon. Desde el front, llamala
con supabase.rpc('submit_entry', {...}) y manejá el error de email duplicado
(23505) mostrando "Ya existe un pronóstico con ese email". Así no hay fila
huérfana que limpiar y no choca con las políticas RLS.

Paso 4 — Card compartible (el motor viral)
Creá PredictionCard: un div estilizado (paleta negro/crema, premium, 
editorial) que muestre las 4 banderas elegidas, "Campeón: [bandera]", el @ del 
usuario y el logo MazzProde. Exportalo a PNG con html-to-image. Agregá un 
botón "Compartir" con Web Share API y fallback a descarga. Mostralo apenas se 
confirma el pronóstico, con el CTA "Compartí en tu story y etiquetá a 2 amigos".

Paso 5 — Ranking
Construí "/ranking": tabla que lee participants + predictions, ordenada así:
1) points desc (mayor puntaje primero)
2) desempate 1: menor diferencia absoluta entre final_goals predicho y el 
   real de results (más cerca = mejor)
3) desempate 2: participants.created_at asc (quien cargó primero gana)
Mostrá posición, @ de instagram y puntos. Mobile-first, paleta negro/crema, 
mismo estilo del resto.

Paso 6 — Admin + scoring
Construí "/admin", protegida (solo accesible si el email logueado = 
VITE_ADMIN_EMAIL). Permití cargar el resultado real en la tabla results 
(4 semifinalistas, subcampeón, campeón, goles). Agregá un botón "Recalcular" 
que recorra todas las predictions y asigne points: +10 por cada semifinalista 
acertado, +25 subcampeón exacto, +50 campeón exacto. Guardá los points.