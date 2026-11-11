-- Support staff: look up one student at a time (by exact phone or email), see their page and points,
-- fix their details and reset their password. No admin rights in the database: the server does
-- these lookups and edits with the service key after checking the role.
alter type public.user_role add value if not exists 'support';
