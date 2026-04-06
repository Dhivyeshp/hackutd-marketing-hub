-- HackUTD Marketing Hub — member seed
-- Run this in the Supabase SQL editor after creating the users table.
-- Members have no password_hash — they log in via magic code (Resend).
-- Lead password_hash must be set separately (see CLAUDE.MD for bcrypt instructions).

insert into users (name, email, role, team, clickup_user_id) values
  -- Lead
  ('Dhivyesh Prithiviraj', 'dhivyesh.prithiviraj@acmutd.co', 'lead',   null,       '95320168'),

  -- Outreach
  ('Shraddha Subash',      'shraddha.subash@acmutd.co',      'member', 'outreach', '101129319'),

  -- UI/UX
  ('Jordan Joelson',       'jordan.joelson@acmutd.co',       'member', 'uiux',     '95329645'),

  -- Content
  ('Sristi Srinivasan',    'sristi.srinivasan@acmutd.co',    'member', 'content',  '95332807'),
  ('Danish Ejaz',          'danish.ejaz@acmutd.co',          'member', 'content',  '95329662'),
  ('Andrea Alvidres',      'andrea.alvidres@acmutd.co',      'member', 'content',  '95329660'),
  ('Karan Jatoth',         'karan.jatoth@acmutd.co',         'member', 'content',  '95329659'),

  -- Design
  ('Ann Jayan',            'ann.jayan@acmutd.co',            'member', 'design',   '95332810'),
  ('Shiloh Asir',          'shiloh.asir@acmutd.co',          'member', 'design',   '95329657'),
  ('Lisa Lupeitu''u',      'lisa.lupeituu@acmutd.co',        'member', 'design',   '95329656'),
  ('Saran Jacob',          'saran.jacob@acmutd.co',          'member', 'design',   '95329655'),
  ('Santiago Islas',       'santiago.islas@acmutd.co',       'member', 'design',   '95329661')

on conflict (email) do update set
  clickup_user_id = excluded.clickup_user_id,
  team            = excluded.team,
  role            = excluded.role;
