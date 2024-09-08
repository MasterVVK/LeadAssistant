# init_openai.py
import os
import openai


def init_openai_client():
    # Установка прокси через переменные окружения
    os.environ['HTTP_PROXY'] = ""
    os.environ['HTTPS_PROXY'] = ""

    # Установка ключа API OpenAI
    openai.api_key = os.environ['OPENAI_API_KEY']

    # Возвращаем объект клиента
    return openai
