-- =============================================================================
-- Enterprise PMS — comprehensive demo seed (local dev: `npm run supabase:reset`)
-- =============================================================================
--
-- Demo password for all accounts: Demo123!
--
-- | Email                 | Role              | Factory   | Notes                    |
-- |-----------------------|-------------------|-----------|--------------------------|
-- | director@demo.local   | company_director  | —         | Full access              |
-- | fm.riyadh@demo.local  | factory_manager   | RYD       | Riyadh plant manager     |
-- | fm.jeddah@demo.local  | factory_manager   | JED       | Jeddah plant manager     |
-- | pm.ahmed@demo.local   | project_manager   | RYD       | Assigned to live project |
-- | pm.sara@demo.local    | project_manager   | RYD       | Unassigned PM            |
-- | pm.khalid@demo.local  | project_manager   | JED       | Jeddah PM                |
-- | inactive@demo.local   | project_manager   | RYD       | is_active = false        |
--
-- Covers: all project / phase / task statuses, active & inactive factories,
-- rejected projects with reason, blocked tasks, comments on project/phase/task.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Fixed UUIDs (reproducible across resets)
-- ---------------------------------------------------------------------------

-- Factories
-- f1 Riyadh, f2 Jeddah, f3 Dammam (inactive)
-- Users: u1 director, u2 fm riyadh, u3 fm jeddah, u4 pm ahmed, u5 pm sara, u6 pm khalid, u7 inactive
-- Projects: b1..b7 (one per project_status; hex-only UUIDs)

-- ---------------------------------------------------------------------------
-- Factories
-- ---------------------------------------------------------------------------

insert into public.factories (id, name, code, location, is_active) values
  ('f1111111-1111-4111-8111-111111111111', 'Riyadh Manufacturing Plant', 'RYD', 'Riyadh, Saudi Arabia', true),
  ('f2222222-2222-4222-8222-222222222222', 'Jeddah Industrial Complex', 'JED', 'Jeddah, Saudi Arabia', true),
  ('f3333333-3333-4333-8333-333333333333', 'Dammam Legacy Facility', 'DMM', 'Dammam, Saudi Arabia', false);

-- ---------------------------------------------------------------------------
-- Auth users
-- Profiles are created by on_auth_user_created from app_metadata (role +
-- factory_id). Do not ALTER auth.users triggers — seed role is not owner.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'a1111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'director@demo.local',
    crypt('Demo123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"company_director"}'::jsonb,
    '{"full_name":"Omar Al-Rashid"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a2222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'fm.riyadh@demo.local',
    crypt('Demo123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"factory_manager","factory_id":"f1111111-1111-4111-8111-111111111111"}'::jsonb,
    '{"full_name":"Fatima Al-Harbi"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a3333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'fm.jeddah@demo.local',
    crypt('Demo123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"factory_manager","factory_id":"f2222222-2222-4222-8222-222222222222"}'::jsonb,
    '{"full_name":"Youssef Al-Ghamdi"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a4444444-4444-4444-8444-444444444444',
    'authenticated',
    'authenticated',
    'pm.ahmed@demo.local',
    crypt('Demo123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"project_manager","factory_id":"f1111111-1111-4111-8111-111111111111"}'::jsonb,
    '{"full_name":"Ahmed Al-Mutairi"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a5555555-5555-4555-8555-555555555555',
    'authenticated',
    'authenticated',
    'pm.sara@demo.local',
    crypt('Demo123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"project_manager","factory_id":"f1111111-1111-4111-8111-111111111111"}'::jsonb,
    '{"full_name":"Sara Al-Qahtani"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a6666666-6666-4666-8666-666666666666',
    'authenticated',
    'authenticated',
    'pm.khalid@demo.local',
    crypt('Demo123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"project_manager","factory_id":"f2222222-2222-4222-8222-222222222222"}'::jsonb,
    '{"full_name":"Khalid Al-Dosari"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a7777777-7777-4777-8777-777777777777',
    'authenticated',
    'authenticated',
    'inactive@demo.local',
    crypt('Demo123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"project_manager","factory_id":"f1111111-1111-4111-8111-111111111111"}'::jsonb,
    '{"full_name":"Inactive User"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  );

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values
  ('a1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', '{"sub":"a1111111-1111-4111-8111-111111111111","email":"director@demo.local"}'::jsonb, 'email', 'a1111111-1111-4111-8111-111111111111', now(), now(), now()),
  ('a2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', '{"sub":"a2222222-2222-4222-8222-222222222222","email":"fm.riyadh@demo.local"}'::jsonb, 'email', 'a2222222-2222-4222-8222-222222222222', now(), now(), now()),
  ('a3333333-3333-4333-8333-333333333333', 'a3333333-3333-4333-8333-333333333333', '{"sub":"a3333333-3333-4333-8333-333333333333","email":"fm.jeddah@demo.local"}'::jsonb, 'email', 'a3333333-3333-4333-8333-333333333333', now(), now(), now()),
  ('a4444444-4444-4444-8444-444444444444', 'a4444444-4444-4444-8444-444444444444', '{"sub":"a4444444-4444-4444-8444-444444444444","email":"pm.ahmed@demo.local"}'::jsonb, 'email', 'a4444444-4444-4444-8444-444444444444', now(), now(), now()),
  ('a5555555-5555-4555-8555-555555555555', 'a5555555-5555-4555-8555-555555555555', '{"sub":"a5555555-5555-4555-8555-555555555555","email":"pm.sara@demo.local"}'::jsonb, 'email', 'a5555555-5555-4555-8555-555555555555', now(), now(), now()),
  ('a6666666-6666-4666-8666-666666666666', 'a6666666-6666-4666-8666-666666666666', '{"sub":"a6666666-6666-4666-8666-666666666666","email":"pm.khalid@demo.local"}'::jsonb, 'email', 'a6666666-6666-4666-8666-666666666666', now(), now(), now()),
  ('a7777777-7777-4777-8777-777777777777', 'a7777777-7777-4777-8777-777777777777', '{"sub":"a7777777-7777-4777-8777-777777777777","email":"inactive@demo.local"}'::jsonb, 'email', 'a7777777-7777-4777-8777-777777777777', now(), now(), now());

-- Trigger creates active profiles; mark demo inactive account after insert.
update public.profiles
set is_active = false
where id = 'a7777777-7777-4777-8777-777777777777';

-- ---------------------------------------------------------------------------
-- Projects — one row per project_status enum value
-- ---------------------------------------------------------------------------

insert into public.projects (
  id, factory_id, title, description, status, budget, currency,
  proposed_start_date, proposed_end_date, actual_start_date, actual_end_date,
  proposed_by, assigned_pm_id, approved_by, approved_at, rejection_reason, progress_percent
) values
  -- draft
  (
    'b1111111-1111-4111-8111-111111111111',
    'f1111111-1111-4111-8111-111111111111',
    'New Automation Line',
    'Proposal to automate packaging line 3 with robotic palletizers.',
    'draft',
    2500000.00, 'SAR',
    '2026-09-01', '2027-03-31',
    null, null,
    null, null, null, null, null,
    0
  ),
  -- proposed (awaiting director approval)
  (
    'b2222222-2222-4222-8222-222222222222',
    'f1111111-1111-4111-8111-111111111111',
    'Solar Panel Installation',
    'Rooftop solar array to offset 40% of plant energy consumption.',
    'proposed',
    1800000.00, 'SAR',
    '2026-08-01', '2026-12-31',
    null, null,
    'a2222222-2222-4222-8222-222222222222', null,
    null, null, null,
    0
  ),
  -- approved (PM assigned, not yet started)
  (
    'b3333333-3333-4333-8333-333333333333',
    'f1111111-1111-4111-8111-111111111111',
    'Warehouse Expansion',
    'Add 2,000 sqm cold storage to support export growth.',
    'approved',
    4200000.00, 'SAR',
    '2026-07-01', '2027-01-31',
    null, null,
    'a2222222-2222-4222-8222-222222222222',
    'a4444444-4444-4444-8444-444444444444',
    'a1111111-1111-4111-8111-111111111111',
    '2026-06-15 10:00:00+00',
    null,
    0
  ),
  -- rejected (with mandatory reason)
  (
    'b4444444-4444-4444-8444-444444444444',
    'f1111111-1111-4111-8111-111111111111',
    'Outdoor Storage Yard',
    'Temporary outdoor storage for seasonal inventory overflow.',
    'rejected',
    350000.00, 'SAR',
    '2026-06-01', '2026-08-31',
    null, null,
    'a2222222-2222-4222-8222-222222222222', null,
    null, null,
    'Budget exceeds Q3 cap; resubmit with phased rollout and revised cost breakdown.',
    0
  ),
  -- in_progress (full WBS below — primary demo project)
  (
    'b5555555-5555-4555-8555-555555555555',
    'f1111111-1111-4111-8111-111111111111',
    'Production Line Upgrade',
    'Replace aging conveyor system and upgrade PLC controls on Line 2.',
    'in_progress',
    3100000.00, 'SAR',
    '2026-04-01', '2026-10-31',
    '2026-04-15', null,
    'a2222222-2222-4222-8222-222222222222',
    'a4444444-4444-4444-8444-444444444444',
    'a1111111-1111-4111-8111-111111111111',
    '2026-03-20 14:30:00+00',
    null,
    42.50
  ),
  -- completed
  (
    'b6666666-6666-4666-8666-666666666666',
    'f1111111-1111-4111-8111-111111111111',
    'Safety Compliance 2025',
    'Annual safety audit remediation and certification renewal.',
    'completed',
    890000.00, 'SAR',
    '2025-01-01', '2025-06-30',
    '2025-01-05', '2025-06-28',
    'a2222222-2222-4222-8222-222222222222',
    'a4444444-4444-4444-8444-444444444444',
    'a1111111-1111-4111-8111-111111111111',
    '2024-12-20 09:00:00+00',
    null,
    100
  ),
  -- paused
  (
    'b7777777-7777-4777-8777-777777777777',
    'f2222222-2222-4222-8222-222222222222',
    'Cooling System Overhaul',
    'HVAC and chiller replacement for Jeddah facility — paused pending vendor contract.',
    'paused',
    1500000.00, 'SAR',
    '2026-05-01', '2026-11-30',
    '2026-05-10', null,
    'a3333333-3333-4333-8333-333333333333',
    'a6666666-6666-4666-8666-666666666666',
    'a1111111-1111-4111-8111-111111111111',
    '2026-04-28 11:00:00+00',
    null,
    18.00
  );

-- ---------------------------------------------------------------------------
-- Phases — in_progress project (weights sum to 100%)
-- ---------------------------------------------------------------------------

insert into public.phases (id, project_id, name, description, weight_percent, status, sort_order) values
  ('e1111111-1111-4111-8111-111111111111', 'b5555555-5555-4555-8555-555555555555', 'Planning & Design', 'Engineering specs and vendor selection', 20.00, 'completed', 1),
  ('e2222222-2222-4222-8222-222222222222', 'b5555555-5555-4555-8555-555555555555', 'Procurement', 'Equipment ordering and delivery tracking', 25.00, 'in_progress', 2),
  ('e3333333-3333-4333-8333-333333333333', 'b5555555-5555-4555-8555-555555555555', 'Installation', 'On-site mechanical and electrical work', 40.00, 'pending', 3),
  ('e4444444-4444-4444-8444-444444444444', 'b5555555-5555-4555-8555-555555555555', 'Commissioning', 'Testing, training, and handover', 15.00, 'pending', 4);

-- Phases for completed project
insert into public.phases (id, project_id, name, description, weight_percent, status, sort_order) values
  ('e5555555-5555-4555-8555-555555555555', 'b6666666-6666-4666-8666-666666666666', 'Assessment', 'Gap analysis against regulations', 30.00, 'completed', 1),
  ('e6666666-6666-4666-8666-666666666666', 'b6666666-6666-4666-8666-666666666666', 'Remediation', 'Fix identified non-conformities', 50.00, 'completed', 2),
  ('e7777777-7777-4777-8777-777777777777', 'b6666666-6666-4666-8666-666666666666', 'Certification', 'Final audit and certificate issuance', 20.00, 'completed', 3);

-- Phases for paused Jeddah project
insert into public.phases (id, project_id, name, description, weight_percent, status, sort_order) values
  ('e8888888-8888-4888-8888-888888888888', 'b7777777-7777-4777-8777-777777777777', 'Vendor Selection', 'RFP and contract negotiation', 100.00, 'in_progress', 1);

-- ---------------------------------------------------------------------------
-- Tasks — all task_status values on in_progress project
-- ---------------------------------------------------------------------------

insert into public.tasks (id, project_id, phase_id, title, description, status, blocked_reason, assignee_id, due_date, sort_order) values
  -- Planning phase (completed)
  ('d1111111-1111-4111-8111-111111111111', 'b5555555-5555-4555-8555-555555555555', 'e1111111-1111-4111-8111-111111111111', 'Finalize engineering drawings', 'Sign off on conveyor layout', 'done', null, 'a4444444-4444-4444-8444-444444444444', '2026-04-30', 1),
  ('d2222222-2222-4222-8222-222222222222', 'b5555555-5555-4555-8555-555555555555', 'e1111111-1111-4111-8111-111111111111', 'Vendor shortlist approval', 'Compare 3 vendor proposals', 'done', null, 'a2222222-2222-4222-8222-222222222222', '2026-05-05', 2),
  -- Procurement phase (in_progress + blocked)
  ('d3333333-3333-4333-8333-333333333333', 'b5555555-5555-4555-8555-555555555555', 'e2222222-2222-4222-8222-222222222222', 'Issue purchase orders', 'PO for conveyor motors and PLCs', 'in_progress', null, 'a4444444-4444-4444-8444-444444444444', '2026-07-15', 1),
  ('d4444444-4444-4444-8444-444444444444', 'b5555555-5555-4555-8555-555555555555', 'e2222222-2222-4222-8222-222222222222', 'Custom PLC programming', 'Vendor firmware customization', 'blocked', 'Vendor delayed firmware delivery by 6 weeks — escalated to leadership.', 'a4444444-4444-4444-8444-444444444444', '2026-07-01', 2),
  ('d5555555-5555-4555-8555-555555555555', 'b5555555-5555-4555-8555-555555555555', 'e2222222-2222-4222-8222-222222222222', 'Shipping logistics', 'Coordinate freight and customs', 'todo', null, 'a5555555-5555-4555-8555-555555555555', '2026-08-01', 3),
  -- Installation phase (pending)
  ('d6666666-6666-4666-8666-666666666666', 'b5555555-5555-4555-8555-555555555555', 'e3333333-3333-4333-8333-333333333333', 'Site preparation', 'Clear Line 2 for installation window', 'todo', null, null, '2026-09-01', 1),
  -- Commissioning phase (pending)
  ('d7777777-7777-4777-8777-777777777777', 'b5555555-5555-4555-8555-555555555555', 'e4444444-4444-4444-8444-444444444444', 'Operator training', 'Train shift leads on new controls', 'todo', null, 'a4444444-4444-4444-8444-444444444444', '2026-10-15', 1);

-- Tasks for completed project
insert into public.tasks (id, project_id, phase_id, title, description, status, blocked_reason, assignee_id, due_date, sort_order) values
  ('d8888888-8888-4888-8888-888888888888', 'b6666666-6666-4666-8666-666666666666', 'e5555555-5555-4555-8555-555555555555', 'Regulatory gap analysis', null, 'done', null, 'a4444444-4444-4444-8444-444444444444', '2025-02-01', 1),
  ('d9999999-9999-4999-8999-999999999999', 'b6666666-6666-4666-8666-666666666666', 'e6666666-6666-4666-8666-666666666666', 'Install emergency exits signage', null, 'done', null, 'a4444444-4444-4444-8444-444444444444', '2025-04-01', 1),
  ('daaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'b6666666-6666-4666-8666-666666666666', 'e7777777-7777-4777-8777-777777777777', 'Obtain safety certificate', null, 'done', null, 'a4444444-4444-4444-8444-444444444444', '2025-06-15', 1);

-- Blocked task on paused Jeddah project (second escalation scenario)
insert into public.tasks (id, project_id, phase_id, title, description, status, blocked_reason, assignee_id, due_date, sort_order) values
  ('dbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b7777777-7777-4777-8777-777777777777', 'e8888888-8888-4888-8888-888888888888', 'Finalize vendor contract', 'Legal review pending board approval', 'blocked', 'Board meeting postponed — contract signature on hold.', 'a6666666-6666-4666-8666-666666666666', '2026-06-30', 1);

-- ---------------------------------------------------------------------------
-- Comments — project, phase, and task entities
-- ---------------------------------------------------------------------------

insert into public.comments (id, entity_type, entity_id, author_id, body) values
  -- Project-level
  ('c1111111-1111-4111-8111-111111111111', 'project', 'b5555555-5555-4555-8555-555555555555', 'a1111111-1111-4111-8111-111111111111', 'Please keep weekly progress updates on the procurement delay.'),
  ('c2222222-2222-4222-8222-222222222222', 'project', 'b2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', 'Solar proposal submitted — awaiting your review.'),
  ('c3333333-3333-4333-8333-333333333333', 'project', 'b4444444-4444-4444-8444-444444444444', 'a1111111-1111-4111-8111-111111111111', 'Rejected: please revise budget and resubmit as phased project.'),
  -- Phase-level
  ('c4444444-4444-4444-8444-444444444444', 'phase', 'e2222222-2222-4222-8222-222222222222', 'a4444444-4444-4444-8444-444444444444', 'Procurement is 60% complete; motors delivered, PLCs pending.'),
  -- Task-level (including escalation thread on blocked task)
  ('c5555555-5555-4555-8555-555555555555', 'task', 'd4444444-4444-4444-8444-444444444444', 'a4444444-4444-4444-8444-444444444444', 'Blocked: vendor confirmed 6-week delay on custom firmware.'),
  ('c6666666-6666-4666-8666-666666666666', 'task', 'd4444444-4444-4444-8444-444444444444', 'a1111111-1111-4111-8111-111111111111', 'Escalation acknowledged — contacting vendor account manager today.'),
  ('c7777777-7777-4777-8777-777777777777', 'task', 'dbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'a6666666-6666-4666-8666-666666666666', 'Waiting on board approval before contract can be signed.');

commit;
