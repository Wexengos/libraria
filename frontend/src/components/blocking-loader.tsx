import { LoaderCircle } from 'lucide-react'

export function BlockingLoader({ label }: { label: string }) {
  return <div className="blocking-loader" role="status" aria-live="polite" aria-busy="true">
    <LoaderCircle className="blocking-loader-icon" size={34} aria-hidden="true" />
    <span>{label}</span>
  </div>
}
