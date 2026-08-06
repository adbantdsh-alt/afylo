-- Afylo — confirmation de réception par l'ACHETEUR : libère le séquestre (status -> released).
-- L'argent n'est versé au vendeur qu'après cette confirmation. À exécuter dans l'éditeur SQL Supabase.

create or replace function public.confirm_order(p_order_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.orders
    set status = 'released', updated_at = now()
  where id = p_order_id
    and buyer_id = auth.uid()
    and status in ('shipped', 'delivered');
end $$;

grant execute on function public.confirm_order(uuid) to authenticated;
