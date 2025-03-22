# from openai import OpenAI #OpenAI kullanılıyorsa
#from transformers import pipeline #Hugging Face Transformers kullanılıyorsa

# client = OpenAI(api_key="YOUR_API_KEY") # .env dosyasından okunacak


def analyze_sentiment_openai(text):
    """Duygu analizi (OpenAI API kullanarak)."""
    # response = client.chat.completions.create(
    #     model="gpt-3.5-turbo",
    #     messages=[
    #         {
    #             "role": "system",
    #             "content": "You are a helpful assistant that analyzes the sentiment of text. Return one of these words: positive, negative or neutral",
    #         },
    #         {
    #             "role": "user",
    #             "content": f"Analyze: {text}",
    #         },
    #     ],
    # )
    # return response.choices[0].message.content.strip().lower()
    return "OpenAI analizi burada olacak"


def analyze_sentiment_transformers(text):
    """Duygu analizi (Hugging Face Transformers kullanarak)."""
    # sentiment_pipeline = pipeline("sentiment-analysis")
    # result = sentiment_pipeline(text)[0]  # Örnek: [{'label': 'POSITIVE', 'score': 0.999}]
    # return result['label'].lower()
    return "Transformers analizi burada olacak."

def analyze_sentiment(text):
  """
  Verilen metnin duygu analizini yapar.  OpenAI veya Transformers kullanır.
  """
  #return analyze_sentiment_openai(text) #OpenAI kullanmak için
  return analyze_sentiment_transformers(text) #Transformers kullanmak için