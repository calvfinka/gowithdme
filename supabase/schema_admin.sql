-- Panel admin v2: klasifikasi konser & pendakian. Jalankan di SQL Editor.
alter table events
  add column if not exists end_date date,
  add column if not exists genre text,
  add column if not exists lineup text,
  add column if not exists mountain text,
  add column if not exists altitude_mdpl int,
  add column if not exists difficulty text check (difficulty in ('pemula','menengah','sulit')),
  add column if not exists duration text;
