# Build Commands
## Backend (FastAPI)
- Start server: `uvicorn src.main:app --reload`
- Run tests: `python -m pytest` (single test: `python -m pytest tests/test_file.py::test_name`)
- Lint: `ruff check src/` (format: `ruff format src/`)
- Type check: `python -m mypy src/`

## Frontend (React/Vite)
- Start dev: `cd Frontend && npm run dev`
- Build: `cd Frontend && npm run build`
- Test: `cd Frontend && npm test` (single test: `npm test -- --testNamePattern="testName"`)
- Lint: `cd Frontend && npm run lint`

# Code Style Guidelines
## Python (Backend)
- snake_case variables/functions, PascalCase classes
- Import order: stdlib → third-party → local
- Type hints with Pydantic models, use pydantic.Field for validation
- HTTPException for API errors, async/await for DB ops
- MongoDB via motor, Firebase admin for auth

## JavaScript/React (Frontend)
- camelCase variables/functions, PascalCase components
- Import order: React → third-party → local
- Functional components with hooks, Firebase auth via useAuth
- Error boundaries for async operations, React Router for navigation