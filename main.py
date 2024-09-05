import json
import os
import time
import openai
from flask import Flask, jsonify, request
from openai import OpenAI
import functions

# Проверка совместимости версии OpenAI
from packaging import version


OPENAI_API_KEY = os.environ['OPENAI_API_KEY']


required_version = version.parse("1.1.1")
current_version = version.parse(openai.__version__)

if current_version < required_version:
  raise ValueError(
      f"Error: OpenAI version {openai.__version__} is less than the required version 1.1.1"
  )
else:
  print("OpenAI version is compatible.")

# Создание Flask приложения
app = Flask(__name__)

# Инициализация клиента OpenAI
client = OpenAI(api_key=OPENAI_API_KEY)

# Создание или загрузка помощника
assistant_id = functions.create_assistant(
    client)  # Эта функция из файла 'functions.py'


# Запуск потока обсуждения
@app.route('/start', methods=['GET'])
def start_conversation():
  print("Starting a new conversation...")
  thread = client.beta.threads.create()
  print(f"New thread created with ID: {thread.id}")
  return jsonify({"thread_id": thread.id})


# Генерация ответа
@app.route('/chat', methods=['POST'])
def chat():
  data = request.json
  thread_id = data.get('thread_id')
  user_input = data.get('message', '')

  if not thread_id:
    print("Error: Missing thread_id")
    return jsonify({"error": "Missing thread_id"}), 400

  print(f"Received message: {user_input} for thread ID: {thread_id}")

  # Добавление сообщения пользователя в поток
  client.beta.threads.messages.create(thread_id=thread_id,
                                      role="user",
                                      content=user_input)

  # Запуск помощника
  run = client.beta.threads.runs.create(thread_id=thread_id,
                                        assistant_id=assistant_id)

  # Проверка необходимости действия в ходе выполнения
  while True:
    run_status = client.beta.threads.runs.retrieve(thread_id=thread_id,
                                                   run_id=run.id)
    # Вывод статуса выполнения: {run_status.status}
    if run_status.status == 'completed':
      break
    elif run_status.status == 'requires_action':
      # Обработка вызова функции
      for tool_call in run_status.required_action.submit_tool_outputs.tool_calls:
        if tool_call.function.name == "create_lead":
          # Создание лидов
          arguments = json.loads(tool_call.function.arguments)
          output = functions.create_lead(arguments["name"], arguments["phone"], arguments["date"], arguments["service"])
          client.beta.threads.runs.submit_tool_outputs(thread_id=thread_id,
                                                       run_id=run.id,
                                                       tool_outputs=[{
                                                           "tool_call_id":
                                                           tool_call.id,
                                                           "output":
                                                           json.dumps(output)
                                                       }])
      time.sleep(1)  # Ожидание одной секунды перед следующей проверкой

  # Получение и возврат последнего сообщения от помощника
  messages = client.beta.threads.messages.list(thread_id=thread_id)
  response = messages.data[0].content[0].text.value

  print(f"Assistant response: {response}")
  return jsonify({"response": response})


if __name__ == '__main__':
  app.run(host='0.0.0.0', port=8085)