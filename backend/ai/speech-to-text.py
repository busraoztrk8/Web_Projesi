#from openai import OpenAI
#client = OpenAI() #.env'den api key okunmalı

def speech_to_text_openai(audio_file):
    """Sesi metne çevirme (OpenAI Whisper API kullanarak)."""
    # transcript = client.audio.transcriptions.create(
    #     model="whisper-1",
    #     file=audio_file #Flask'tan gelen FileStorage objesi olmalı.
    # )
    # return transcript.text
    return "OpenAI ile sesten metne çevirme burada olacak"

def speech_to_text(audio_file):
  """Ses dosyasını metne çevirir."""
  return speech_to_text_openai(audio_file) #OpenAI kullan.