import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  organization_id: string;
  role: string;
  full_name: string | null;
  email: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logo_url: string | null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async (uid: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("*, organizations(*)")
        .eq("id", uid)
        .maybeSingle();

      if (data) {
        const { organizations: org, ...rest } = data as Profile & {
          organizations: Organization | null;
        };
        setProfile(rest as Profile);
        setOrganization(org);
      } else {
        setProfile(null);
        setOrganization(null);
      }
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Defer to avoid blocking the auth callback
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setOrganization(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, user, profile, organization, loading, signOut };
}
