import { redirect } from "next/navigation"
import { getPortalUser } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { TwoFactorSettings } from "@/components/portal/two-factor-settings"

export default async function AdminSecurityPage() {
  const user = await getPortalUser()
  if (!user) redirect("/portal/login")
  if (user.role !== "admin") redirect("/portal/dashboard")

  const supabase = getServiceSupabase()
  const { data: profile } = await supabase.from("clients").select("is_2fa_enabled").eq("id", user.id).single()

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Security</h1>
      <TwoFactorSettings initiallyEnabled={Boolean(profile?.is_2fa_enabled)} />
    </div>
  )
}
