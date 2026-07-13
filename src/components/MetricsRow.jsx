import { StatCard } from './ui'
import { num, pct } from '../lib/format'

// Every tile is a door — clicking opens the list behind the number.
export default function MetricsRow({ m }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Audits Completed"
        value={num(m.auditsComplete)}
        sub={`${num(m.auditsTotal)} total created`}
        accent
        to="audits"
      />
      <StatCard label="Active Sites" value={num(m.activeSites)} sub="warehouses / clients" to="sites" />
      <StatCard
        label="Leads in Pipeline"
        value={num(m.totalLeads)}
        sub={`+ ${num(m.digitalLeads)} digital leads`}
        to="crm"
      />
      <StatCard
        label="Outreach-Ready"
        value={num(m.leadsWithEmail)}
        sub={`${pct(m.leadEmailRate)} have an email`}
        to="crm"
      />
      <StatCard label="OSHA Standards" value={num(m.oshaStandards)} sub="in knowledge base" />
    </div>
  )
}
