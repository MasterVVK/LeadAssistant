import json
import requests
import os
from openai import OpenAI
from prompts import assistant_instructions



OPENAI_API_KEY = os.environ['OPENAI_API_KEY']

# Инициализация клиента OpenAI
client = OpenAI(api_key=OPENAI_API_KEY)

# Отправка данных о потенциальном клиенте в Make
def create_lead(name, phone, date, service):
    url = "Подставь свой адрес вебхука"
    data = {
        "name": name,
        "phone": phone,
        "date": date,
        "service": service
    }
    response = requests.post(url, json=data)
    try:
        # Проверяем, есть ли содержимое в ответе перед попыткой его разобрать как JSON
        if response.content:
            return response.json()
        else:
            print("No data received in response")
            return {}
    except json.JSONDecodeError:
        print(f"Failed to parse JSON from response: {response.text}")
        return {}

# Создать или загрузить ассистента
def create_assistant(client):
    assistant_file_path = 'assistant.json'

    # Если файл assistant.json уже существует, то загрузить этого ассистента
    if os.path.exists(assistant_file_path):
        with open(assistant_file_path, 'r') as file:
            assistant_data = json.load(file)
            assistant_id = assistant_data['assistant_id']
            print("Loaded existing assistant ID.")
    else:
        # Если файла assistant.json нет, создать нового ассистента с использованием указанных ниже спецификаций
        
        assistant = client.beta.assistants.create(
            instructions=assistant_instructions,
            model="gpt-4o",
            tools=[
                {
                    "type": "file_search"  # Это добавляет базу знаний в качестве инструмента
                },
                {
                    "type": "function",  # Это добавляет функцию захвата лидов в качестве инструмента
                    "function": {
                        "name": "create_lead",
                        "description": "Capture lead details and save to Make.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "Name of the lead."
                                },
                                "phone": {
                                    "type": "string",
                                    "description": "Phone number of the lead."
                                },
                                "date": {
                                    "type": "string",
                                    "description": "Date."
                                },
                                "service": {
                                    "type": "string",
                                    "description": "Service."
                                }
                            },
                            "required": ["name", "phone", "date", "service"]
                        }
                    }
                }
            ]
            )
        vector_store = client.beta.vector_stores.create(name="knowledge")

        file_paths = ["knowledge.json"]
        file_streams = [open(path, "rb") for path in file_paths]

        file_batch = client.beta.vector_stores.file_batches.upload_and_poll(
            vector_store_id=vector_store.id, files=file_streams
            )

        print(file_batch.status)
        print(file_batch.file_counts)

        assistant = client.beta.assistants.update(
        assistant_id=assistant.id,
        tool_resources={"file_search": {"vector_store_ids": [vector_store.id]}},
        )

        # Создать новый файл assistant.json для загрузки в будущем. Создано Aibot.Direct
        with open(assistant_file_path, 'w') as file:
            json.dump({'assistant_id': assistant.id}, file)
            print("Created a new assistant and saved the ID.")

        assistant_id = assistant.id

    return assistant_id
