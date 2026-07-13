// Real-shape fixture from production DB (descriptions truncated).
const F = (id, sev, pri, type, pen, dis=null) => ({
  id, audit_id: 'b4034b4c-427d-4cdd-9b31-c8149ab834ff', photo_id: '2202bab3-5294-4d16-a7b7-69e7b930d440',
  finding_type: type, cfr_citation: '1910.176(b)', cfr_title: 'Handling materials',
  title: 'Finding ' + id, description: 'desc', severity: sev, priority: pri,
  estimated_penalty: pen, recommended_action: 'fix it', ai_confidence: 0.8,
  created_at: '2026-06-30T13:28:01.658664+00:00', dismissed_at: dis, dismissal_reason: null,
})
export const payload = {
  fetchedAt: new Date().toISOString(),
  audits: [{
    id: 'b4034b4c-427d-4cdd-9b31-c8149ab834ff', site_id: '56d18fd8-3cc7-4d9b-90a3-aa61fe4886a7',
    created_by: '23efa27a-7918-4466-bf52-a4bb40ce9bb0', title: 'June 2026 Audit', audit_date: '2026-06-30',
    status: 'complete', compliance_score: 71, total_findings: 10, actual_findings_count: 3,
    potential_findings_count: 7, total_penalty_exposure: 115282,
    created_at: '2026-06-30T13:27:09.085641+00:00', completed_at: '2026-06-30T13:28:04.79+00:00',
  }],
  sites: [
    { id: '8ac77057-39ab-4d25-b6d9-17dea6a5fd2d', name: 'Seatac', company_name: 'Alstom', address: null,
      city: 'Seattle', state: 'WA', zip: null, site_type: 'other', square_footage: null, employee_count: 50,
      subscription_tier: 'free', subscription_status: 'active', trial_ends_at: null,
      photos_used_this_month: 0, created_at: '2026-05-08T02:03:33.980289+00:00' },
    { id: '56d18fd8-3cc7-4d9b-90a3-aa61fe4886a7', name: 'Ocala MFG/DC', company_name: 'Closetmaid', address: null,
      city: 'Ocala', state: 'Fl', zip: null, site_type: 'manufacturing', square_footage: null, employee_count: 350,
      subscription_tier: 'free', subscription_status: 'active', trial_ends_at: null,
      photos_used_this_month: 1, created_at: '2026-06-30T13:23:35.482432+00:00' },
  ],
  findings: [
    F('f1','serious','critical','actual',16131), F('f2','other_than_serious','medium','actual',4624),
    F('f3','serious','high','actual',16131), F('f4','serious','high','potential',16131),
    F('f5','serious','medium','potential',16131), F('f6','other_than_serious','medium','potential',4624),
    F('f7','other_than_serious','low','potential',4624), F('f8','serious','medium','potential',16131),
    F('f9','serious','medium','potential',16131), F('f10','other_than_serious','low','potential',4624),
  ],
  actions: [],
  users: [
    { id: '35e17d8d-c958-428e-8d8d-a8fbc3975ccc', email: 'brian.mountain@yahoo.com', full_name: 'Brian Mountain', created_at: '2026-05-08T02:03:33.772294+00:00' },
    { id: '23efa27a-7918-4466-bf52-a4bb40ce9bb0', email: 'jessicaleetorino@gmail.com', full_name: 'Jessica Torino', created_at: '2026-06-30T13:23:35.212405+00:00' },
    { id: '783011f9-dc68-4e7a-a81a-c68211fb93bd', email: 'acescompliancesystems@gmail.com', full_name: 'Nour Alsharife', created_at: '2026-04-27T23:28:10.03345+00:00' },
  ],
  members: [
    { id: 'm1', site_id: '8ac77057-39ab-4d25-b6d9-17dea6a5fd2d', user_id: '35e17d8d-c958-428e-8d8d-a8fbc3975ccc', role: 'owner', joined_at: '2026-05-08T02:03:34.318462+00:00' },
    { id: 'm2', site_id: '56d18fd8-3cc7-4d9b-90a3-aa61fe4886a7', user_id: '23efa27a-7918-4466-bf52-a4bb40ce9bb0', role: 'owner', joined_at: '2026-06-30T13:23:35.718134+00:00' },
  ],
  photos: [{ id: '2202bab3-5294-4d16-a7b7-69e7b930d440', audit_id: 'b4034b4c-427d-4cdd-9b31-c8149ab834ff', zone_label: null, status: 'analyzed', uploaded_at: '2026-06-30T13:27:12.127722+00:00', analyzed_at: '2026-06-30T13:28:01.902+00:00' }],
  actionUpdates: [], compLeads: [], digiLeads: [], workflowRuns: [], contacts: [],
  oshaStandards: 137, health: { restReachable: true, probes: [], serverMs: 1 }, errors: {},
}
