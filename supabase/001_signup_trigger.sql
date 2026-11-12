insert into questions (answer_type, suggested_key, text_en) values
  ('short_answer', 'food', 'How was the food?'),
  ('short_answer', 'service', 'How was the service?')
on conflict (suggested_key) do nothing;

create or replace function public.handle_new_owner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  rid uuid;
  lang text := coalesce(new.raw_user_meta_data->>'language', 'en');
begin
  insert into restaurants (owner_id, owner_name, name, slug, feedback_language, interface_language)
  values (
    new.id,
    new.raw_user_meta_data->>'owner_name',
    new.raw_user_meta_data->>'restaurant_name',
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
    lang,
    lang
  )
  returning id into rid;

  insert into restaurant_questions (restaurant_id, question_id, position)
  select rid, id, case suggested_key when 'food' then 1 else 2 end
  from questions
  where suggested_key in ('food', 'service');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_owner();