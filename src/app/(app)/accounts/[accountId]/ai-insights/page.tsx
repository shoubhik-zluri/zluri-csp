export default function AccountAiInsightsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-slate-800 mb-1">AI Insights coming soon</h3>
      <p className="text-xs text-slate-400 max-w-xs">Account-scoped AI analysis will surface risks, draft emails, and summarise activity in the next release.</p>
    </div>
  )
}
