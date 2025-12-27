import React from 'react'
import AnalysisCard from '../components/AnalysisCard'

const DUMMY_PREVIOUS = [
  { id:1, date:'2025-09-12', analysis: { interpretation:'Low iron markers; mild anemia.', lifestyle_changes:['Increase exercise'], nutritional_changes:['Add iron-rich foods'], symptom_probable_cause:null, next_steps:['Consult doctor'], concern_options:['Hemoglobin','Ferritin'] } },
  { id:2, date:'2025-06-08', analysis: { interpretation:'Vitamin D deficiency.', lifestyle_changes:['Daily sun exposure 10-20 min'], nutritional_changes:['Supplement vitamin D'], symptom_probable_cause:null, next_steps:['Supplement & retest in 3 months'], concern_options:['Vitamin D'] } }
]

export default function PreviousReports(){
  return (
    <div>
      <h2>Previous Reports</h2>
      <p className="small-muted">List of previous analyses (dummy entries)</p>
      <div style={{display:'grid', gap:12}}>
        {DUMMY_PREVIOUS.map(r => (
          <div key={r.id} className="card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <strong>{r.date}</strong>
              <div className="small-muted">{r.analysis.interpretation.slice(0,60)}...</div>
            </div>
            <AnalysisCard analysis={r.analysis} compact />
          </div>
        ))}
      </div>
    </div>
  )
}
