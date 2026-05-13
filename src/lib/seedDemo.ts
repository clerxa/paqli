import { supabase } from "@/integrations/supabase/client";

export async function seedDemoData(organizationId: string, userId: string) {
  const { data: existing } = await supabase
    .from("packages")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1);

  if (existing && existing.length > 0) return;

  const { data: packages } = await supabase
    .from("packages")
    .insert([
      {
        organization_id: organizationId,
        created_by: userId,
        title: "Senior Engineer — Backend",
        status: "active",
        gross_salary: 75000,
        variable_target: 8000,
      },
      {
        organization_id: organizationId,
        created_by: userId,
        title: "Product Manager",
        status: "active",
        gross_salary: 65000,
        variable_target: 10000,
      },
      {
        organization_id: organizationId,
        created_by: userId,
        title: "Design Manager",
        status: "draft",
        gross_salary: 60000,
        variable_target: 6000,
      },
    ])
    .select();

  if (!packages) return;

  const candidates = [
    { name: "Thomas B.", email: "thomas@example.com" },
    { name: "Camille D.", email: "camille@example.com" },
    { name: "Marc L.", email: "marc@example.com" },
  ];

  for (const pkg of packages.filter((p) => p.status === "active")) {
    const { data: links } = await supabase
      .from("candidate_links")
      .insert(
        candidates.map((c) => ({
          package_id: pkg.id,
          organization_id: organizationId,
          candidate_email: c.email,
          candidate_name: c.name,
        })),
      )
      .select();

    if (!links) continue;

    for (const link of links.slice(0, 2)) {
      const openedAt = new Date(Date.now() - 3600000).toISOString();
      const simulatedAt = new Date(Date.now() - 1800000).toISOString();
      await supabase.from("link_events").insert([
        { link_id: link.id, event_type: "opened", created_at: openedAt },
        { link_id: link.id, event_type: "simulated", created_at: simulatedAt },
      ]);
      await supabase
        .from("candidate_links")
        .update({ opened_at: openedAt, simulated_at: simulatedAt })
        .eq("id", link.id);
    }
  }
}
