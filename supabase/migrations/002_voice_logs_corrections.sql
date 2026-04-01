-- 음성 명령 로그
create table voice_logs (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade,
  company_id uuid references companies(id),
  speaker text not null check (speaker in ('user', 'system')),
  text text not null,
  action_json jsonb,
  feedback text check (feedback in ('positive', 'negative')),
  created_at timestamptz default now()
);

-- 음성 교정 이력
create table voice_corrections (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade,
  company_id uuid references companies(id),
  original_text text not null,
  original_action jsonb,
  correction_text text,
  corrected_action jsonb,
  context jsonb,
  status text default 'active' check (status in ('active', 'resolved')),
  created_at timestamptz default now()
);

-- RLS
alter table voice_logs enable row level security;
create policy "company_isolation" on voice_logs
  using (company_id = (select company_id from users where id = auth.uid()));

alter table voice_corrections enable row level security;
create policy "company_isolation" on voice_corrections
  using (company_id = (select company_id from users where id = auth.uid()));

-- 인덱스
create index idx_voice_logs_estimate on voice_logs(estimate_id);
create index idx_voice_corrections_estimate on voice_corrections(estimate_id);
create index idx_voice_corrections_company on voice_corrections(company_id, status);
