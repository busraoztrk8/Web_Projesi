def recommend_content(sentiment):
    """
    Kullanıcının duygu durumuna göre içerik önerileri sunar.
    (Daha gelişmiş bir sürümde, NLP ve collaborative filtering kullanılabilir)
    """
    if sentiment == "positive":
        return {
            "music": ["upbeat_playlist_1", "happy_songs"],
            "books": ["inspirational_book_1"],
            "articles": ["positive_news_article"]
        }
    elif sentiment == "negative":
        return {
            "music": ["calm_playlist", "meditation_music"],
            "meditation": ["guided_meditation_for_sadness"],
             "articles":["coping_with_sadness_article"]
        }
    else:  # Neutral
        return {
            "music": ["focus_playlist", "instrumental_music"],
            "books": ["neutral_book","interesting_facts_book"],
              "articles":["productivity_tips"]
        }