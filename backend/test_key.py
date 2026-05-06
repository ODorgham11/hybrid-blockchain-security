import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

def test_key():
    key = os.getenv("GOOGLE_API_KEY")
    print(f"Testing key starting with: {key[:10]}...")
    
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=key)
        response = llm.invoke("Hello, are you working?")
        print("SUCCESS! API key is working.")
        print(f"Response: {response.content}")
    except Exception as e:
        print("FAILED!")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")

if __name__ == "__main__":
    test_key()
