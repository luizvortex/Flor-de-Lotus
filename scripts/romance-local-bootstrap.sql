-- Isolated PostgreSQL only: minimal Supabase Auth/Storage interfaces, no production users.
do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;end $$;
create schema auth;
create schema storage;
create schema extensions;
create table auth.users(id uuid primary key,aud text,role text,email text,email_confirmed_at timestamptz,deleted_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz,updated_at timestamptz,not_after timestamptz);
create table auth.identities(id uuid primary key default gen_random_uuid(),provider_id text,user_id uuid references auth.users(id),identity_data jsonb,provider text);
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;$$;
create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid;$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner uuid,metadata jsonb,unique(bucket_id,name));
alter table storage.objects enable row level security;
grant usage on schema auth,storage to anon,authenticated;
grant execute on function auth.uid(),auth.jwt() to anon,authenticated;
grant select,insert,delete on storage.objects to authenticated;
