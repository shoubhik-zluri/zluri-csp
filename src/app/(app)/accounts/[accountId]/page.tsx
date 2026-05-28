import { redirect } from 'next/navigation'

export default async function AccountDetailPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params
  redirect(`/accounts/${accountId}/overview`)
}
