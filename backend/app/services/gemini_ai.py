import json
import re

import httpx

from app.core.config import settings


class GeminiSearchService:
	def __init__(self) -> None:
		self.api_key = settings.GEMINI_API_KEY
		self.model = settings.GEMINI_MODEL

	@property
	def is_enabled(self) -> bool:
		return bool(self.api_key)

	async def interpret_student_query(self, query: str) -> dict:
		if not self.api_key:
			return {}

		prompt = (
			"You are helping search a school fee dashboard. Convert the user's request into JSON only. "
			"Return an object with these optional keys: name_contains, reg_number_contains, student_class_contains, "
			"balance_min, balance_max, balance_status, sort_by, sort_direction. "
			"balance_status must be one of all, owing, or paid. sort_by must be one of name, balance, class, created_at. "
			"sort_direction must be asc or desc. Do not include any explanation. User query: "
			f"{query}"
		)

		url = (
			f"https://generativelanguage.googleapis.com/v1beta/models/"
			f"{self.model}:generateContent?key={self.api_key}"
		)

		payload = {
			"contents": [{"parts": [{"text": prompt}]}],
			"generationConfig": {
				"temperature": 0,
				"responseMimeType": "application/json",
			},
		}

		async with httpx.AsyncClient(timeout=30) as client:
			response = await client.post(url, json=payload)
			response.raise_for_status()
			data = response.json()

		text = ""
		candidates = data.get("candidates", [])
		if candidates:
			content = candidates[0].get("content", {})
			parts = content.get("parts", [])
			if parts:
				text = parts[0].get("text", "")

		return self._parse_json(text)

	def _parse_json(self, text: str) -> dict:
		if not text:
			return {}

		cleaned = text.strip()
		if cleaned.startswith("```"):
			cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
			cleaned = re.sub(r"\s*```$", "", cleaned)

		try:
			return json.loads(cleaned)
		except json.JSONDecodeError:
			start = cleaned.find("{")
			end = cleaned.rfind("}")
			if start != -1 and end != -1 and end > start:
				try:
					return json.loads(cleaned[start : end + 1])
				except json.JSONDecodeError:
					return {}
			return {}
