"""
LLM Client for Gemini and OpenAI integration.
Provides a unified interface for different LLM providers.
"""
import os
from typing import Optional, List, Dict, Any

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "mock")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


class LLMClient:
    """Unified LLM client supporting multiple providers."""
    
    def __init__(self):
        self.provider = LLM_PROVIDER.lower()
        self._client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the appropriate LLM client based on provider."""
        if self.provider == "gemini":
            if not GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY not set in environment")
            try:
                import google.generativeai as genai
                genai.configure(api_key=GEMINI_API_KEY)
                # List available models to debug
                try:
                    models = genai.list_models()
                    print("Available Gemini models:")
                    for m in models:
                        if 'generateContent' in m.supported_generation_methods:
                            print(f"  - {m.name}")
                except Exception as list_err:
                    print(f"Could not list models: {list_err}")
                
                # Use models/ prefix for v1 API
                model_name = GEMINI_MODEL if GEMINI_MODEL.startswith('models/') else f'models/{GEMINI_MODEL}'
                self._client = genai.GenerativeModel(model_name)
                print(f"✓ Gemini initialized: {model_name}")
            except Exception as e:
                print(f"✗ Gemini initialization failed: {e}")
                raise
        
        elif self.provider == "openai":
            if not OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not set in environment")
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=OPENAI_API_KEY)
                print(f"✓ OpenAI initialized: {OPENAI_MODEL}")
            except Exception as e:
                print(f"✗ OpenAI initialization failed: {e}")
                raise
        
        elif self.provider == "mock":
            print("⚠ Using mock LLM (no real API calls)")
            self._client = None
        
        else:
            raise ValueError(f"Unknown LLM provider: {self.provider}")
    
    def generate_text(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generate text completion from prompt."""
        if self.provider == "gemini":
            import google.generativeai as genai
            
            # Configure safety settings to allow full responses
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
            
            response = self._client.generate_content(
                prompt,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens or 8192,
                },
                safety_settings=safety_settings,
            )
            
            # Handle potential blocked responses
            if not response.text:
                if hasattr(response, 'prompt_feedback'):
                    raise ValueError(f"Response blocked: {response.prompt_feedback}")
                raise ValueError("Empty response from Gemini")
            
            return response.text
        
        elif self.provider == "openai":
            response = self._client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        
        else:  # mock
            return f"[MOCK] Simple response based on prompt length: {len(prompt)} chars"
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Multi-turn chat conversation."""
        if self.provider == "gemini":
            # Convert to Gemini chat format
            chat = self._client.start_chat(history=[])
            for msg in messages[:-1]:  # All but last
                if msg["role"] == "user":
                    chat.send_message(msg["content"])
            # Send final message and get response
            response = chat.send_message(
                messages[-1]["content"],
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens or 2048,
                }
            )
            return response.text
        
        elif self.provider == "openai":
            response = self._client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        
        else:  # mock
            last_msg = messages[-1]["content"] if messages else "No message"
            return f"[MOCK] Chat response to: {last_msg[:50]}..."
    
    def extract_structured_data(
        self,
        content: str,
        schema: str,
        temperature: float = 0.1,
    ) -> str:
        """Extract structured data from unstructured content."""
        prompt = f"""Extract structured information from the following content according to this schema:

{schema}

Content:
{content}

Return ONLY valid JSON matching the schema. No explanations."""
        
        return self.generate_text(prompt, temperature=temperature)
    
    def analyze_document(
        self,
        content: str,
        doc_type: str = "maintenance document",
    ) -> Dict[str, Any]:
        """Analyze a document and extract key information."""
        prompt = f"""Analyze this {doc_type} and extract:
1. Document type and purpose
2. Key entities (equipment, employees, locations, tasks)
3. Important dates and schedules
4. Required skills or certifications
5. Parts or materials mentioned

Document content:
{content[:3000]}...

Return a structured JSON summary."""
        
        response = self.generate_text(prompt, temperature=0.2)
        
        # Try to parse as JSON, fallback to dict
        try:
            import json
            return json.loads(response)
        except:
            return {"raw_analysis": response}


# Global LLM client instance
_llm_client: Optional[LLMClient] = None


def get_llm() -> LLMClient:
    """Get or create the global LLM client."""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
