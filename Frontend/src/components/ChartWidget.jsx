import React from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend)

export default function ChartWidget({biomarker}){
  // DUMMY dataset — replace with real time-series data per-user and per-biomarker
  const labels = ['2025-01','2025-03','2025-06','2025-09','2025-12']
  const sampleValues = {
    'Hemoglobin':[13.4,13.1,12.8,12.6,12.9],
    'Fasting Glucose':[95,100,110,125,118],
    'Vitamin D':[32,28,25,20,26]
  }

  const data = {
    labels,
    datasets: [
      {
        label: biomarker,
        data: sampleValues[biomarker] || [10,20,30,40,50],
        borderColor: 'rgba(14,165,164,0.9)',
        backgroundColor: 'rgba(14,165,164,0.2)',
        tension: 0.3,
        fill: true
      }
    ]
  }

  return (
    <div>
      {/* Chart uses dummy values above — integrate real timeseries here */}
      <Line data={data} />
    </div>
  )
}
