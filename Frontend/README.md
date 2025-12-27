# Health Report Frontend (Demo)

This is a demo React frontend scaffold for a health-report-analysis app.

Features included (with dummy data):
- Login / Register pages (UI only)
- Dashboard showing charts of selected biomarkers (dummy data)
- Profile page to store user metadata
- Upload report page that returns a generated analysis (dummy data; comment included where used)
- Previous reports list (dummy data)
- Floating Chat button to speak to an LLM agent (UI only, mock responses)

How to run:

```bash
cd /home/parv/Frontend
npm install
npm run dev
```

Notes:
- This project uses `lucide-react` for icons and `react-chartjs-2` + `chart.js` for charts.
- All analysis and chart data in this scaffold are dummy placeholders (look for comments). Replace with real API calls/backend when ready.

Images and mockups
- Copy the images you attached into `src/assets/` (see `src/assets/README.txt` for exact filenames). The Login and Dashboard pages reference those images for the demo UI. If you don't provide the images, the layout still works but won't show the illustrations.
