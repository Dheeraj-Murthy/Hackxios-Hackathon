import React from 'react'
import AnalysisCard from '../components/AnalysisCard'
import ChartWidget from '../components/ChartWidget'

const DUMMY_CONCERNED = [
  {name:'Vitamin D', value:'14 ng/mL'},
  {name:'Ferritin', value:'25 ng/mL'},
  {name:'TSH', value:'2.5 IU/mL'}
]

export default function Dashboard(){
  return (
    <div>
      <div className="hero">
        <div className="hero-left" style={{flex:1}}>
          <h2>Welcome back, John!</h2>
          <p className="small-muted">Based on your latest blood test, your Vitamin D is lower than the optimal range. Increasing your Vitamin D intake and getting more sunlight is recommended.</p>
        </div>
      </div>

      <h3>Concern Biomarkers</h3>
      <div className="concern-row">
        {DUMMY_CONCERNED.map((c, idx)=> (
          <div key={c.name} className="card concern-card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div>
                <strong>{c.name}</strong>
                <div className="small-muted">{c.value}</div>
              </div>
            </div>
            <div style={{marginTop:8}}>
              {/* Mini chart with dummy data */}
              <ChartWidget biomarker={c.name} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid">
        <div className="card">
          <h3>Actionable Suggestions</h3>
          <div style={{paddingTop:8}}>
            <ul style={{marginTop:8}}>
              <li>Get 15-30 minutes of sunlight exposure daily.</li>
              <li>Exercise regularly, at least 3 times per week.</li>
              <li>Consider vitamin D supplement after consulting GP.</li>
              <li>Limit refined carbohydrates and added sugars.</li>
            </ul>
          </div>
        </div>

        <div className="card">
          <h3>Detailed Analysis</h3>
          <AnalysisCard analysis={{
            interpretation: 'The report shows elevated fasting glucose and borderline low vitamin D. Hemoglobin within normal range.',
            lifestyle_changes: ['Reduce refined carbs', '30 min brisk walk 5x per week'],
            nutritional_changes: ['Increase vitamin D rich foods', 'Moderate carbohydrate intake'],
            symptom_probable_cause: null,
            next_steps: ['Consult GP for metabolic panel', 'Repeat test in 3 months'],
            concern_options: ['Fasting Glucose','Vitamin D','HbA1c']
          }} />
        </div>
      </div>
    </div>
  )
}
