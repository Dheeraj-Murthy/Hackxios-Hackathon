import React from 'react'
import { CheckCircle } from 'lucide-react'

export default function AnalysisCard({analysis, compact=false}){
  if(!analysis) return null
  return (
    <div className="card analysis-card">
      <h3 style={{marginTop:0}}>Analysis</h3>

      <div className="analysis-interpretation">
        <strong>Interpretation</strong>
        <p className="small-muted">{analysis.interpretation}</p>
      </div>

      <div className="analysis-sections">
        <div className="analysis-section">
          <h4>Lifestyle changes</h4>
          <ul className="analysis-list">
            {analysis.lifestyle_changes.map((c,i)=> (
              <li key={i}><CheckCircle size={16} style={{verticalAlign:'middle', marginRight:8, color:'#06b6d4'}}/>{c}</li>
            ))}
          </ul>
        </div>

        <div className="analysis-section">
          <h4>Nutritional changes</h4>
          <ul className="analysis-list">
            {analysis.nutritional_changes.map((c,i)=>(<li key={i}>{c}</li>))}
          </ul>
        </div>

        {analysis.symptom_probable_cause && (
          <div className="analysis-section">
            <h4>Probable cause</h4>
            <p>{analysis.symptom_probable_cause}</p>
          </div>
        )}

        <div className="analysis-section">
          <h4>Next steps</h4>
          <ol className="analysis-nextsteps">
            {analysis.next_steps.map((s,i)=>(<li key={i}>{s}</li>))}
          </ol>
        </div>

        <div className="analysis-section">
          <h4>Concern options</h4>
          <div className="concern-chips">
            {analysis.concern_options.map((c,i)=>(<span key={i} className="chip">{c}</span>))}
          </div>
        </div>
      </div>

      {compact ? null : <p style={{fontSize:12, color:'#6b7280', marginTop:12}}>Note: This is dummy analysis in the demo (replace with LLM-generated analysis from server).</p>}
    </div>
  )
}
