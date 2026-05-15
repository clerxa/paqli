-- Risque 2 : suppression du doublon profiles.role
-- Préalables vérifiés : 0 RLS lit profiles.role, 0 code lit profile.role, 0 user sans user_roles.
-- La fonction bootstrap_user_workspace est mise à jour pour ne plus écrire profiles.role.

CREATE OR REPLACE FUNCTION public.bootstrap_user_workspace(_org_name text, _full_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  user_email text;
  existing_org uuid;
  new_org_id uuid;
  slug text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id INTO existing_org FROM public.profiles WHERE id = uid;
  IF existing_org IS NOT NULL THEN
    RETURN existing_org;
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = uid;

  slug := regexp_replace(lower(coalesce(_org_name, 'workspace')), '[^a-z0-9]+', '-', 'g')
          || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO public.organizations (name, slug, plan)
  VALUES (coalesce(nullif(trim(_org_name), ''), 'Mon entreprise'), slug, 'starter')
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, organization_id, full_name, email)
  VALUES (uid, new_org_id, _full_name, user_email);

  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (uid, new_org_id, 'admin');

  RETURN new_org_id;
END;
$function$;

-- Drop la colonne doublon (la source de vérité reste user_roles + has_role()).
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;