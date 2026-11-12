with new_restaurants as (
  insert into restaurants (owner_id, owner_name, name, slug, feedback_language, interface_language)
  select
    u.id,
    coalesce(nullif(trim(u.raw_user_meta_data->>'owner_name'), ''), split_part(u.email, '@', 1)),
    coalesce(nullif(trim(u.raw_user_meta_data->>'restaurant_name'), ''), 'My Restaurant'),
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
    coalesce(u.raw_user_meta_data->>'language', 'en'),
    coalesce(u.raw_user_meta_data->>'language', 'en')
  from auth.users u
  where not exists (select 1 from restaurants r where r.owner_id = u.id)
  returning id
)
insert into restaurant_questions (restaurant_id, question_id, position)
select nr.id, q.id, case q.suggested_key when 'food' then 1 else 2 end
from new_restaurants nr
cross join questions q
where q.suggested_key in ('food', 'service');