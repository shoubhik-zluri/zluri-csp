import PageHeader from '@/components/layout/PageHeader'

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="App configuration" />
      <div className="p-6 max-w-lg">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm text-slate-500">Additional settings will be added here in a future release.</p>
        </div>
      </div>
    </div>
  )
}
