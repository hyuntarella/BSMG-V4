-- ============================================
-- 방수명가 v4 — 초기 스키마
-- ============================================

-- 1. companies (멀티테넌시)
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_number text,
  ceo_name text,
  address text,
  phone text,
  email text,
  logo_url text,
  created_at timestamptz default now()
);

-- 2. users (인증 + 역할)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id),
  name text not null,
  phone text,
  role text not null default 'sales',
  created_at timestamptz default now(),
  constraint valid_role check (role in ('admin', 'sales', 'customer'))
);

-- 3. customers (CRM)
create table customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  name text not null,
  address text,
  phone text,
  email text,
  manager_id uuid references users(id),
  pipeline text default '문의',
  contract_status text,
  inquiry_channel text,
  work_types text[] default '{}',
  estimate_amount bigint,
  contract_amount bigint,
  area_pyeong numeric,
  memo text,
  inquiry_date date,
  visit_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. estimates (견적서 메타)
create table estimates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  customer_id uuid references customers(id),
  created_by uuid references users(id),
  mgmt_no text,
  status text default 'draft',
  date date default current_date,
  customer_name text,
  site_name text,
  m2 numeric default 0,
  wall_m2 numeric default 0,
  manager_name text,
  manager_phone text,
  memo text,
  excel_url text,
  pdf_url text,
  folder_path text,
  email_sent_at timestamptz,
  email_viewed_at timestamptz,
  email_to text,
  voice_session_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_status check (status in ('draft', 'saved', 'sent', 'viewed'))
);

-- 5. estimate_sheets (복합/우레탄 시트)
create table estimate_sheets (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade,
  type text not null,
  title text,
  plan text,
  price_per_pyeong integer default 0,
  warranty_years integer default 5,
  warranty_bond integer default 3,
  grand_total bigint default 0,
  sort_order integer default 0,
  created_at timestamptz default now(),
  constraint valid_type check (type in ('복합', '우레탄'))
);

-- 6. estimate_items (공종 행)
create table estimate_items (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid references estimate_sheets(id) on delete cascade,
  sort_order integer not null,
  name text not null,
  spec text default '',
  unit text default 'm²',
  qty numeric default 0,
  mat integer default 0,
  labor integer default 0,
  exp integer default 0,
  mat_amount bigint default 0,
  labor_amount bigint default 0,
  exp_amount bigint default 0,
  total bigint default 0,
  is_base boolean default true,
  is_equipment boolean default false,
  is_fixed_qty boolean default false,
  created_at timestamptz default now()
);

-- 7. price_matrix (P매트릭스)
create table price_matrix (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  area_range text not null,
  method text not null,
  price_per_pyeong integer not null,
  item_index integer not null,
  mat numeric default 0,
  labor numeric default 0,
  exp numeric default 0,
  unique(company_id, area_range, method, price_per_pyeong, item_index)
);

-- 8. presets (프리셋 공종)
create table presets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  name text not null,
  spec text default '',
  unit text default 'm²',
  mat integer default 0,
  labor integer default 0,
  exp integer default 0,
  category text default 'custom',
  used_count integer default 0,
  last_used date,
  created_at timestamptz default now()
);

-- 9. cost_config (원가 테이블)
create table cost_config (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null unique,
  config jsonb not null,
  updated_at timestamptz default now()
);

-- 10. voice_sessions (음성 세션)
create table voice_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  created_by uuid references users(id),
  customer_id uuid references customers(id),
  status text default 'collecting',
  parsed_data jsonb default '{}',
  raw_texts text[] default '{}',
  command_history jsonb[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 11. estimate_changes (수정 이력)
create table estimate_changes (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade,
  changed_by uuid references users(id),
  change_type text not null,
  change_data jsonb not null,
  created_at timestamptz default now(),
  constraint valid_change_type check (change_type in ('voice', 'manual', 'auto'))
);

-- ============================================
-- 인덱스
-- ============================================
create index idx_estimates_company on estimates(company_id);
create index idx_estimates_customer on estimates(customer_id);
create index idx_estimates_created_by on estimates(created_by);
create index idx_estimate_sheets_estimate on estimate_sheets(estimate_id);
create index idx_estimate_items_sheet on estimate_items(sheet_id);
create index idx_customers_company on customers(company_id);
create index idx_price_matrix_lookup on price_matrix(company_id, area_range, method, price_per_pyeong);
create index idx_estimate_changes_estimate on estimate_changes(estimate_id);

-- ============================================
-- RLS 정책
-- ============================================

-- companies
alter table companies enable row level security;
create policy "companies_read" on companies for select
  using (id = (select company_id from users where id = auth.uid()));

-- users
alter table users enable row level security;
create policy "users_read_company" on users for select
  using (company_id = (select company_id from users u where u.id = auth.uid()));
create policy "users_update_self" on users for update
  using (id = auth.uid());

-- customers
alter table customers enable row level security;
create policy "customers_company_isolation" on customers for all
  using (company_id = (select company_id from users where id = auth.uid()));

-- estimates
alter table estimates enable row level security;
create policy "estimates_company_isolation" on estimates for select
  using (company_id = (select company_id from users where id = auth.uid()));
create policy "estimates_own_or_admin" on estimates for all
  using (
    created_by = auth.uid()
    or (select role from users where id = auth.uid()) = 'admin'
  );

-- estimate_sheets (cascade through estimate)
alter table estimate_sheets enable row level security;
create policy "sheets_via_estimate" on estimate_sheets for all
  using (
    estimate_id in (
      select id from estimates
      where company_id = (select company_id from users where id = auth.uid())
    )
  );

-- estimate_items (cascade through sheet → estimate)
alter table estimate_items enable row level security;
create policy "items_via_sheet" on estimate_items for all
  using (
    sheet_id in (
      select es.id from estimate_sheets es
      join estimates e on e.id = es.estimate_id
      where e.company_id = (select company_id from users where id = auth.uid())
    )
  );

-- price_matrix
alter table price_matrix enable row level security;
create policy "price_matrix_company" on price_matrix for all
  using (company_id = (select company_id from users where id = auth.uid()));

-- presets
alter table presets enable row level security;
create policy "presets_company" on presets for all
  using (company_id = (select company_id from users where id = auth.uid()));

-- cost_config
alter table cost_config enable row level security;
create policy "cost_config_company" on cost_config for all
  using (company_id = (select company_id from users where id = auth.uid()));

-- voice_sessions
alter table voice_sessions enable row level security;
create policy "voice_sessions_company" on voice_sessions for all
  using (company_id = (select company_id from users where id = auth.uid()));

-- estimate_changes
alter table estimate_changes enable row level security;
create policy "changes_via_estimate" on estimate_changes for all
  using (
    estimate_id in (
      select id from estimates
      where company_id = (select company_id from users where id = auth.uid())
    )
  );
