import { StatCard } from './ui'
import { num, pct } from '../lib/format'

export default function MetricsRow({ m }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Audits Completed"
        value={num(m.auditsComplete)}
        sub={`${num(m.auditsTotal)} total created`}
        accent
      />
      <StatCard label="Active Sites" value={num(m.activeSites)} sub="warehouses / clients" />
      <StatCard
        label="Leads in Pipeline"
        value={num(m.totalLeads)}
        sub={`+ ${num(m.digitalLeads)} digital leads`}
      />
      <StatCard
        label="Outreach-Ready"
        value={num(m.leadsWithEmail)}
        sub={`${pct(m.leadEmailRate)} have an email`}
      />
      <StatCard label="OSHA Standards" value={num(m.oshaStandards)} sub="in knowledge base" />
    </div>
  )
}
