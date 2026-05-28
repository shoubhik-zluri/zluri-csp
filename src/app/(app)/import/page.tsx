import PageHeader from '@/components/layout/PageHeader'
import CsvImporter from '@/components/import/CsvImporter'

export default function ImportPage() {
  return (
    <div>
      <PageHeader
        title="Import Accounts"
        subtitle="Upload a CSV to create or update account data"
      />
      <div className="p-6 max-w-2xl">
        <CsvImporter />
      </div>
    </div>
  )
}
