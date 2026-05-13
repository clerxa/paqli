CREATE OR REPLACE FUNCTION public.bootstrap_user_workspace(_org_name text, _full_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.profiles (id, organization_id, role, full_name, email)
  VALUES (uid, new_org_id, 'admin', _full_name, user_email);

  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (uid, new_org_id, 'admin');

  RETURN new_org_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bootstrap_user_workspace(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_user_workspace(text, text) TO authenticated;