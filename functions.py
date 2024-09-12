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
    url = "https://hook.eu2.make.com/onszla435nbvwbuyhqjlrt1vos5ugw73"
    data = {
        "name": name,
        "phone": phone,
        "date": date,
        "service": service
    }
    response = requests.post(url, json=data)
    try:
        if response.content:
            return response.json()
        else:
            print("No data received in response")
            return {}
    except json.JSONDecodeError:
        print(f"Failed to parse JSON from response: {response.text}")
        return {}


# Загрузка файла с функциями времени для ассистента
def upload_time_functions_file():
    with open('assistant_time_functions_updated.py', 'rb') as f:
        response = client.files.create(
            file=f,
            purpose='assistants'  # Указываем правильное назначение файла
        )
        return response.id  # Доступ через атрибут


# Создать или загрузить ассистента с включением Code Interpreter
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

        # Шаг 1: Загрузка файла с функциями времени
        file_id = upload_time_functions_file()

        # Шаг 2: Создаем ассистента с Code Interpreter, file_search и функцией захвата лидов
        assistant = client.beta.assistants.create(
            instructions=assistant_instructions,
            model="gpt-4o",
            tools=[
                {
                    "type": "file_search"  # Инструмент для базы знаний
                },
                {
                    "type": "function",  # Инструмент для захвата лидов
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
                },
                {
                    "type": "code_interpreter"  # Инструмент Code Interpreter
                }
            ],
            tool_resources={
                "code_interpreter": {
                    "file_ids": [file_id]  # Привязываем загруженный файл
                }
            }
        )

        # Создание и загрузка файлов для базы знаний
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

        # Сохранение ID ассистента для будущего использования
        with open(assistant_file_path, 'w') as file:
            json.dump({'assistant_id': assistant.id}, file)
            print("Created a new assistant and saved the ID.")

        assistant_id = assistant.id

    return assistant_id
