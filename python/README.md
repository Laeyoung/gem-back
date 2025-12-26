# 💎 Gem Back (Python)

> Smart Gemini API Fallback Library with Multi-Key Rotation & Monitoring

Python implementation of Gem Back.

## Installation

```bash
pip install gemback
```

## Usage

```python
import asyncio
from gemback import GemBack

async def main():
    client = GemBack(
        api_key="YOUR_API_KEY",
        fallback_order=["gemini-2.5-flash", "gemini-2.5-flash-lite"]
    )

    response = await client.generate("Hello, Gemini!")
    print(response.text)

if __name__ == "__main__":
    asyncio.run(main())
```
