'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { buildAutoMapping, normalizeValue, DB_FIELD_LABELS } from '@/lib/csv/parser'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, CheckCircle2, XCircle, FileText, Download } from 'lucide-react'

type Step = 'upload' | 'map' | 'preview' | 'result'

interface ParsedRow {
  [key: string]: string
}

interface ValidationResult {
  rowIndex: number
  original: ParsedRow
  errors: string[]
}

interface ImportResult {
  inserted: number
  updated: number
  errors: Array<{ row: number; message: string }>
  total: number
}

const DB_FIELDS = Object.keys(DB_FIELD_LABELS)

export default function CsvImporter() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [filename, setFilename] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [validation, setValidation] = useState<ValidationResult[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setFilename(file.name)

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedHeaders = results.meta.fields ?? []
        setHeaders(parsedHeaders)
        setRows(results.data as ParsedRow[])
        setMapping(buildAutoMapping(parsedHeaders))
        setStep('map')
      },
      error: () => toast.error('Failed to parse CSV'),
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  })

  function updateMapping(header: string, field: string | null) {
    setMapping((m) => ({ ...m, [header]: field ?? 'skip' }))
  }

  function validateAndPreview() {
    const errors: ValidationResult[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowErrors: string[] = []

      for (const [csvCol, dbField] of Object.entries(mapping)) {
        if (dbField === 'skip' || !row[csvCol]) continue
        if (['slack_channel_name', 'email_domain', 'jira_project_key', 'csm_email', 'org_id'].includes(dbField)) continue

        const { error } = normalizeValue(dbField, row[csvCol])
        if (error) rowErrors.push(`${DB_FIELD_LABELS[dbField] ?? dbField}: ${error}`)
      }

      const nameCol = Object.entries(mapping).find(([, f]) => f === 'name')?.[0]
      if (nameCol && !row[nameCol]?.trim()) rowErrors.push('Account name is required')

      if (rowErrors.length > 0) errors.push({ rowIndex: i, original: row, errors: rowErrors })
    }

    setValidation(errors)
    setStep('preview')
  }

  async function commitImport() {
    setLoading(true)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, mapping, filename }),
      })
      const data: ImportResult = await res.json()
      setResult(data)
      setStep('result')
    } catch {
      toast.error('Import failed')
    } finally {
      setLoading(false)
    }
  }

  function downloadErrorReport() {
    if (!result?.errors?.length) return
    const csv = ['Row,Error', ...result.errors.map((e) => `${e.row},"${e.message}"`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'import-errors.csv'
    a.click()
  }

  function reset() {
    setStep('upload')
    setFilename('')
    setHeaders([])
    setRows([])
    setMapping({})
    setValidation([])
    setResult(null)
  }

  // ── Step: Upload ──────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700">
          {isDragActive ? 'Drop your CSV here' : 'Drag & drop a CSV file, or click to browse'}
        </p>
        <p className="text-xs text-slate-400 mt-1">Supports ChurnZero exports and custom CSV formats</p>
      </div>
    )
  }

  // ── Step: Field Mapping ───────────────────────────────────────
  if (step === 'map') {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">{filename}</span>
          <span className="text-xs text-slate-400">· {rows.length} rows</span>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Map each CSV column to a field in the system. Required: <strong>Account Name</strong>.
        </p>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200 px-4 py-2">
            <span className="text-xs font-semibold text-slate-500">CSV COLUMN</span>
            <span className="text-xs font-semibold text-slate-500">MAP TO</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {headers.map((header) => (
              <div key={header} className="grid grid-cols-2 items-center px-4 py-2.5">
                <span className="text-sm text-slate-700 font-mono text-xs">{header}</span>
                <Select
                  value={mapping[header] ?? 'skip'}
                  onValueChange={(v) => updateMapping(header, v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DB_FIELDS.map((f) => (
                      <SelectItem key={f} value={f}>{DB_FIELD_LABELS[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {!Object.values(mapping).includes('org_id') && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <strong>Organization ID is not mapped.</strong> All rows will fail — you must map a column to Organization ID before importing.
          </p>
        )}

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={reset}>Back</Button>
          <Button onClick={validateAndPreview}>
            Preview Import ({rows.length} rows)
          </Button>
        </div>
      </div>
    )
  }

  // ── Step: Preview ─────────────────────────────────────────────
  if (step === 'preview') {
    const validRows = rows.length - validation.length
    const errorRowIndices = new Set(validation.map((v) => v.rowIndex))

    return (
      <div>
        <div className="flex items-center gap-4 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">{validRows} valid rows</span>
          </div>
          {validation.length > 0 && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{validation.length} rows with errors</span>
            </div>
          )}
        </div>

        {validation.length > 0 && (
          <div className="mb-4 space-y-2 max-h-40 overflow-y-auto">
            {validation.slice(0, 10).map((v) => (
              <div key={v.rowIndex} className="text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="font-medium text-red-700">Row {v.rowIndex + 1}:</span>
                <span className="text-red-600 ml-1">{v.errors.join(' · ')}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-slate-500 mb-4">
          Rows with errors will be skipped. Valid rows will be upserted (matched by account name or org_id).
        </p>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
          <Button onClick={commitImport} disabled={loading || validRows === 0}>
            {loading ? 'Importing...' : `Import ${validRows} Rows`}
          </Button>
        </div>
      </div>
    )
  }

  // ── Step: Result ──────────────────────────────────────────────
  if (step === 'result' && result) {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Import Complete</h3>

        <div className="grid grid-cols-3 gap-4 my-6 max-w-xs mx-auto">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-700">{result.inserted}</p>
            <p className="text-xs text-green-600">Added</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
            <p className="text-xs text-blue-600">Updated</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
            <p className="text-xs text-red-600">Errors</p>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          {result.errors.length > 0 && (
            <Button variant="outline" size="sm" onClick={downloadErrorReport}>
              <Download className="w-4 h-4 mr-1" /> Download Error Report
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={reset}>Import Another File</Button>
          <Button size="sm" onClick={() => router.push('/accounts')}>View Accounts</Button>
        </div>
      </div>
    )
  }

  return null
}
