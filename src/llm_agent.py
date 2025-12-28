from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
import os
import asyncio
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Import config for centralized settings
try:
    from src.core.config import settings
    HAS_CONFIG = True
except ImportError:
    HAS_CONFIG = False


class LLMReportAgent:
    
    def __init__(self, model_name: str = "gemini-2.5-flash", temperature: float = 0.0):
        # Try to get API key from config first, then environment
        if HAS_CONFIG:
            api_key = getattr(settings, 'GEMINI_API_KEY', None)
            if not api_key:
                # Fallback to environment
                api_key = os.getenv("GEMINI_API_KEY")
        else:
            # Fallback to environment only
            api_key = os.getenv("GEMINI_API_KEY")
        
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set. Please add it to your .env file")

        genai.configure(api_key=api_key)
        self.model_name = model_name
        self.temperature = temperature

        
        self.model = genai.GenerativeModel(
            model_name=model_name,
            generation_config={
                "temperature": temperature,
            }
        )

    
    def _build_prompt(self, agent_input: Optional[Dict[str, Any]] = None) -> str:
        parts: List[str] = []
        parts.append(
            "You are a clinical nutrition assistant. Produce a structured JSON output following the LLM-report schema exactly.\n"
            "The analysis schema MUST be a single JSON object with these top-level fields:\n"
            "- analysis: object with (these fields are required):\n"
            "    - interpretation: short paragraph summarizing the key findings and interpretation of results\n"
            "    - lifestyle_changes: list of short actionable suggestions (e.g., '30 min walk daily' for high sugar)\n"
            "    - nutritional_changes: list of short actionable nutritional suggestions (e.g., 'increase iron-rich foods')\n"
            "    - symptom_probable_cause: optional short string if symptoms provided, otherwise null\n"
            "    - next_steps: list of prioritized next steps (e.g., 'consult a doctor', 'repeat test in 3 months')\n"
            "    - concern_options: list of nutrients or vitamins that are concerns/options (strings) which is basically the test fields that you think are most abnormal the user can choose from (3-6 items)\n"
        )

        agent_input = agent_input or {}

        biodata = agent_input.get("biodata")
        if biodata:
            parts.append("BioData (from user profile):\n" + json.dumps(biodata, default=str, indent=2))

        favorites = agent_input.get("favorites")
        if favorites:
            parts.append("Favorites / preferences:\n" + json.dumps(favorites, default=str, indent=2))

        if favorites:
            parts.append(
                "Guidelines based on user preferences:\n"
                "   - Prefer recommendations aligned with Favorites\n"
                "   - Avoid repeating items already in Favorites unless clinically critical\n"
            )

        metrics = agent_input.get("input") or []
        parts.append("Parsed metrics (input):\n" + json.dumps(metrics, default=str, indent=2))


        parts.append(
            "Respond ONLY with a single valid JSON object that exactly follows the LLM-report schema above.\n"
            "Return keys exactly as specified and avoid extra narrative. If you cannot provide a value, use null or an empty list/object.\n"
            "Provide `concern_options` as 3-6 short string items. Ensure output is valid JSON and parsable."
        )

        return "\n\n".join(parts)

    async def analyze(self, agent_input : Optional[Dict[str, Any]] = None) -> Dict[str, Any]:

        prompt = self._build_prompt(agent_input)

        full_prompt = (
            "You are a helpful clinical nutrition assistant.\n\n"
            f"{prompt}"
        )

        # Gemini SDK is synchronous → run in thread
        response = await asyncio.to_thread(
            self.model.generate_content,
            full_prompt
        )

        text = response.text if hasattr(response, "text") else str(response)
        parsed: Dict[str, Any]
        try:
            parsed = json.loads(text)
        except Exception:
            import re

            m = re.search(r"\{[\s\S]*\}", text)
            if m:
                try:
                    parsed = json.loads(m.group(0))
                except Exception:
                    parsed = {"error": "failed_to_parse_model_output", "raw": text}
            else:
                parsed = {"error": "no_json_in_response", "raw": text}

        def ensure_list(v: Any) -> List[Any]:
            if v is None:
                return []
            if isinstance(v, list):
                return v
            # if its a comma separated string
            if isinstance(v, str):
                return [s.strip() for s in v.split("\n") if s.strip()] if "\n" in v else [s.strip() for s in v.split(",") if s.strip()]
            return [v]

        output_candidate = None
        if isinstance(parsed, dict):
            expected_keys = {"interpretation", "lifestyle_changes", "nutritional_changes", "symptom_probable_cause", "next_steps", "concern_options"}
            if expected_keys.issubset(set(parsed.keys())):
                output_candidate = parsed
            else:
                for key in ("output", "analysis", "result", "llm_report"):
                    if key in parsed and isinstance(parsed[key], dict):
                        output_candidate = parsed[key]
                        break
        
        #if key name changes happened
        if output_candidate is None:
            output_candidate = {}

            if isinstance(parsed, dict):
                output_candidate["interpretation"] = parsed.get("interpretation") or parsed.get("summary") or parsed.get("explain") or parsed.get("analysis")
                output_candidate["lifestyle_changes"] = parsed.get("lifestyle_changes") or (parsed.get("advise") and parsed.get("advise").get("lifestyle_advice") if parsed.get("advise") else None)
                output_candidate["nutritional_changes"] = parsed.get("nutritional_changes") or (parsed.get("advise") and parsed.get("advise").get("nutritional_advice") if parsed.get("advise") else None)
                output_candidate["symptom_probable_cause"] = parsed.get("symptom_probable_cause") or parsed.get("probable_cause")
                output_candidate["next_steps"] = parsed.get("next_steps") or parsed.get("recommendations") or parsed.get("recommend")
                output_candidate["concern_options"] = parsed.get("concern_options") or parsed.get("concerns")


        final_output: Dict[str, Any] = {}
        final_output["interpretation"] = output_candidate.get("interpretation") or (str(parsed.get("summary")) if isinstance(parsed, dict) and parsed.get("summary") else None)
        final_output["lifestyle_changes"] = ensure_list(output_candidate.get("lifestyle_changes"))
        final_output["nutritional_changes"] = ensure_list(output_candidate.get("nutritional_changes"))
        final_output["symptom_probable_cause"] = output_candidate.get("symptom_probable_cause") if output_candidate.get("symptom_probable_cause") else None
        final_output["next_steps"] = ensure_list(output_candidate.get("next_steps"))
        concern_options = ensure_list(output_candidate.get("concern_options"))
       
        favorites_list: List[str] = []
        if isinstance(agent_input, dict):
            favorites_list = ensure_list(agent_input.get("favorites"))

        # if concern options are already in fav remove
        for fav in favorites_list:
            if fav in concern_options:
                concern_options.remove(fav)

        final_output["concern_options"] = concern_options
        return final_output

    async def generate_actionable_suggestions(self, meta_input: dict):
        prompt = f"""
        You are a health AI assistant.

        You are given {meta_input.get("report_count")} recent medical reports
        with their AI analyses.

        Your tasks:
            - If only 1 report is available, base suggestions primarily on it
            - If multiple reports exist, detect trends
            - If more than 1 report, prioritize the most recent
            - Generate 4-6 actionable suggestions
            - Keep them concise and practical
            - Avoid repetition

        Data:
        {meta_input}

        Return JSON:
        {{"actionable_suggestions": [string]}}
        """
        response = self.model.generate_content(prompt)
        return self._safe_parse(response)


if __name__ == "__main__":
    print("This module provides LLMReportAgent for use by FastAPI routers. Run the API server instead of this file.")
