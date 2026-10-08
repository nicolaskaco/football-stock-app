-- Normaliza mayúsculas de posiciones de partido (segunda palabra en minúscula)
update public.partido_players set posicion = 'Extremo izquierdo' where posicion = 'Extremo Izquierdo';
update public.partido_players set posicion = 'Delantero centro'  where posicion = 'Delantero Centro';
