-- OpenAI Ads: conversion queue (prepare before merging the application branch).
-- No production changes occur until this SQL is explicitly applied.
create table if not exists homenageando_private.openai_ads_order_attribution (
  order_id uuid primary key references public.orders(id) on delete cascade,
  oppref text not null check (char_length(oppref) between 1 and 1024),
  created_at timestamptz not null default now()
);

create table if not exists homenageando_private.openai_ads_conversion_outbox (
  payment_id text primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  approved_at timestamptz not null,
  oppref text,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  status text not null default 'pending' check (status in ('pending','sent','expired')),
  sent_at timestamptz,
  last_http_status integer,
  created_at timestamptz not null default now()
);
create index if not exists openai_ads_outbox_pending_idx
on homenageando_private.openai_ads_conversion_outbox(next_attempt_at)
where status='pending';
revoke all on homenageando_private.openai_ads_order_attribution from public,anon,authenticated;
revoke all on homenageando_private.openai_ads_conversion_outbox from public,anon,authenticated;

create or replace function homenageando_private.enqueue_openai_ads_paid_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_status = 'APPROVED'
     and new.payment_provider = 'MERCADO_PAGO_PROD'
     and new.payment_external_id ~ '^[0-9]{1,30}$'
     and new.payment_amount_cents > 0
     and new.payment_approved_at is not null
     and (old.payment_status is distinct from new.payment_status
       or old.payment_external_id is distinct from new.payment_external_id)
  then
    insert into homenageando_private.openai_ads_conversion_outbox
       (payment_id, order_id, amount_cents, approved_at, oppref)
    select new.payment_external_id,new.id,new.payment_amount_cents,
           new.payment_approved_at,a.oppref
    from (select 1) s
    left join homenageando_private.openai_ads_order_attribution a
      on a.order_id=new.id
    on conflict (payment_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists enqueue_openai_ads_paid_order_trigger on public.orders;
create trigger enqueue_openai_ads_paid_order_trigger
after update of payment_status,payment_external_id on public.orders
for each row execute function homenageando_private.enqueue_openai_ads_paid_order();

create or replace function public.claim_openai_ads_conversion_events(p_limit integer default 10)
returns setof homenageando_private.openai_ads_conversion_outbox
language plpgsql security definer set search_path=''
as $$
begin
 if current_user not in ('service_role','postgres') then
   raise exception 'Acesso restrito' using errcode='42501';
 end if;
 return query
 with eligible as (
   select o.payment_id
   from homenageando_private.openai_ads_conversion_outbox o
   where o.status='pending'
     and o.next_attempt_at <= now()
     and (o.locked_until is null or o.locked_until < now())
   order by o.next_attempt_at, o.created_at
   for update skip locked
   limit least(greatest(coalesce(p_limit,10),1),25)
 )
 update homenageando_private.openai_ads_conversion_outbox o
 set locked_until=now()+interval '90 seconds',attempts=o.attempts+1
 from eligible e
 where o.payment_id=e.payment_id
 returning o.*;
end;
$$;

create or replace function public.finish_openai_ads_conversion_event(
 p_payment_id text,
 p_sent boolean,
 p_http_status integer default null,
 p_expired boolean default false,
 p_attempts integer default null
)
returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_updated integer;
begin
 if current_user not in ('service_role','postgres') then
   raise exception 'Acesso restrito' using errcode='42501';
 end if;
 update homenageando_private.openai_ads_conversion_outbox o
 set status=case when p_sent then 'sent'
           when p_expired or approved_at < now()-interval '6 days' then 'expired'
           else 'pending' end,
     sent_at=case when p_sent then now() else sent_at end,
     locked_until=null,
     last_http_status=p_http_status,
     next_attempt_at=case when p_sent then now()
       else now()+make_interval(secs=>least(3600, (power(2,least(attempts,10))::integer)*30)) end
 where o.payment_id=p_payment_id and o.status='pending'
   and o.locked_until>now() and o.attempts=p_attempts;
 get diagnostics v_updated=row_count;
 return v_updated=1;
end;
$$;

revoke all on function public.claim_openai_ads_conversion_events(integer) from public,anon,authenticated;
revoke all on function public.finish_openai_ads_conversion_event(text,boolean,integer,boolean,integer) from public,anon,authenticated;
grant execute on function public.claim_openai_ads_conversion_events(integer) to service_role;
grant execute on function public.finish_openai_ads_conversion_event(text,boolean,integer,boolean,integer) to service_role;

-- Only the backend, after authenticating the order owner and receiving explicit
-- measurement consent, may associate an OpenAI click reference with an order.
create or replace function public.record_openai_ads_order_attribution(
  p_order_id uuid, p_oppref text
)
returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_rows integer := 0;
begin
 if current_user not in ('service_role','postgres') then
   raise exception 'Acesso restrito' using errcode='42501';
 end if;
 if p_order_id is null or p_oppref is null
   or length(p_oppref) not between 1 and 1024
   or p_oppref !~ '^[A-Za-z0-9._~%+=/-]+$'
 then
   return false;
 end if;
 insert into homenageando_private.openai_ads_order_attribution(order_id,oppref)
 select id,p_oppref from public.orders
 where id=p_order_id and payment_status='PENDING'
 on conflict (order_id) do nothing;
 get diagnostics v_rows = row_count;
 return v_rows=1;
end;
$$;
revoke all on function public.record_openai_ads_order_attribution(uuid,text) from public,anon,authenticated;
grant execute on function public.record_openai_ads_order_attribution(uuid,text) to service_role;
