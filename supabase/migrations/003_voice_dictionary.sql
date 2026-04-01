-- 음성 인식 동음이의어 교정 사전
create table voice_dictionary (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  wrong_text text not null,
  correct_text text not null,
  context text,
  source text default 'manual',
  created_at timestamptz default now()
);

alter table voice_dictionary enable row level security;
create policy "company_isolation" on voice_dictionary
  using (company_id = (select company_id from users where id = auth.uid()));
