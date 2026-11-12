drop policy "anyone can read restaurants" on restaurants;

create function public.get_restaurant_by_slug(p_slug text)
returns table (id uuid, name text, slug text)
language sql
stable
security definer set search_path = public
as $$
  select id, name, slug from restaurants where slug = p_slug;
$$;

grant execute on function public.get_restaurant_by_slug(text) to anon, authenticated;

alter table restaurants
  add constraint owner_name_not_blank check (length(trim(owner_name)) > 0),
  add constraint name_not_blank check (length(trim(name)) > 0);