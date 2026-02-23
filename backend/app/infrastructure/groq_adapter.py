from groq import Groq
from app.interfaces.llm import ILLM
from app.core.config import GROQ_API_KEY

class GroqAdapter(ILLM):
    def __init__(self):
        if not GROQ_API_KEY:
            raise ValueError("Missing Groq API key in .env")
        self.client = Groq(api_key=GROQ_API_KEY)
        # 👈 We updated the model string right here
        self.model_name = "llama-3.1-8b-instant" 

    def generate_response(self, system_prompt: str, user_prompt: str, temperature: float = 0.0) -> str:
        response = self.client.chat.completions.create(
            model=self.model_name,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )
        return response.choices[0].message.content