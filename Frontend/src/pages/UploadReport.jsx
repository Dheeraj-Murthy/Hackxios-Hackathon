import React, { useState, useRef } from 'react'
import AnalysisCard from '../components/AnalysisCard'
import { UploadCloud } from 'lucide-react'

export default function UploadReport(){
  const [file, setFile] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  function onFile(e){
    const f = e.target.files && e.target.files[0]
    if(f) setFile(f)
  }

  function onDrop(e){
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files && e.dataTransfer.files[0]
    if(f) setFile(f)
  }

  function onUpload(){
    // TODO: Replace this with real upload to backend. The analysis below is DUMMY data.
    // Dummy analysis object created to simulate server LLM-generated report.
    const dummy = {
      interpretation: 'The report shows elevated fasting glucose and borderline low vitamin D. Hemoglobin within normal range.',
      lifestyle_changes: ['Reduce refined carbs', '30 min brisk walk 5x per week'],
      nutritional_changes: ['Increase vitamin D rich foods', 'Moderate carbohydrate intake'],
      symptom_probable_cause: null,
      next_steps: ['Consult GP for metabolic panel', 'Repeat test in 3 months'],
      concern_options: ['Fasting Glucose','Vitamin D','HbA1c']
    }
    // simulate server response
    setTimeout(()=> setAnalysis(dummy), 450)
  }

  return (
    <div>
      <h2>Upload Report</h2>

      <div className="card">
        <div
          className={`upload-drop ${dragOver? 'dragover':''}`}
          onDragOver={(e)=>{ e.preventDefault(); setDragOver(true) }}
          onDragLeave={()=>setDragOver(false)}
          onDrop={onDrop}
        >
          {/* Icon from lucide-react */}
          <UploadCloud size={84} color="#60a5fa" style={{marginBottom:12}} />
          <div style={{fontSize:18, fontWeight:600}}>Drop a file or click to browse</div>
          <div className="small-muted">Supported: PDF, PNG, JPG</div>

          <div className="upload-actions">
            <input ref={inputRef} className="file-input" id="report-file" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={onFile} />
            <button className="upload-btn" onClick={()=>inputRef.current && inputRef.current.click()}>Choose file</button>
            <button className="upload-btn primary" onClick={onUpload} disabled={!file}>{file ? 'Upload & Get Analysis' : 'Upload'}</button>
          </div>

          {file && (
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <button className="remove-file" onClick={()=>setFile(null)}>Remove</button>
            </div>
          )}
        </div>
      </div>

      {analysis && (
        <div style={{marginTop:16}}>
          <AnalysisCard analysis={analysis} />
        </div>
      )}
    </div>
  )
}
