import json
import os
import time
import random
import logging  # Добавляем библиотеку для логирования 2
import openai
import markdown2
from flask import Flask, jsonify, request, session, redirect, url_for, render_template
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from openai import OpenAI
import functions

# Настройка логирования
logging.basicConfig(level=logging.INFO)

OPENAI_API_KEY = os.environ['OPENAI_API_KEY']

# Проверка версии OpenAI
from packaging import version

required_version = version.parse("1.1.1")
current_version = version.parse(openai.__version__)

if current_version < required_version:
    raise ValueError(f"Error: OpenAI version {openai.__version__} is less than the required version 1.1.12")
else:
    print("OpenAI version is compatible.")

app = Flask(__name__)
app.secret_key = 'your_secret_key'

client = OpenAI(api_key=OPENAI_API_KEY)

# Инициализация Flask-Limiter для контроля количества запросов
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["5 per minute"]  # Ограничение на 5 запросов в минуту
)

assistant_id = functions.create_assistant(client)

# Вопросы и ответы для капчи
QUESTIONS = {
    "Сколько будет 2 + 3?": 5,
    "Сколько будет 4 + 1?": 5,
    "Сколько будет 10 - 7?": 3,
    "Сколько будет 6 - 2?": 4,
}

# Генерация вопроса для капчи
def generate_captcha():
    question, answer = random.choice(list(QUESTIONS.items()))
    session['captcha_answer'] = answer  # Сохранение правильного ответа в сессии
    return question

# Маршрут для получения вопроса капчи
@app.route('/get-captcha', methods=['GET'])
def get_captcha():
    question = generate_captcha()
    return jsonify({"question": question})

# Маршрут для проверки ответа на капчу
@app.route('/check-captcha', methods=['POST'])
def check_captcha():
    user_answer = int(request.json.get('answer', 0))
    if user_answer == session.get('captcha_answer'):
        # Если капча пройдена, разрешаем продолжение
        session['captcha_passed'] = True
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": "Неправильный ответ. Попробуйте снова."})

# Главная страница с отображением данных
@app.route('/')
def index():
    with open('knowledge.json', 'r', encoding='utf-8') as knowledge_file:
        knowledge_data = json.load(knowledge_file)

    # Чтение и преобразование содержимого prompts.py
    with open('prompts.py', 'r', encoding='utf-8') as prompts_file:
        prompts_data = prompts_file.read()
        # Убираем "assistant_instructions = """ в начале и """ в конце
        prompts_data = prompts_data.replace('assistant_instructions = """', '').strip().rstrip('"""')
        prompts_html = markdown2.markdown(prompts_data)  # Преобразование Markdown в HTML

    return render_template('index.html', knowledge=knowledge_data, prompts=prompts_html)

# Стартовый маршрут
@app.route('/start', methods=['GET'])
@limiter.limit("2 per minute")  # Ограничение на 2 запроса в минуту
def start_conversation():
    thread = client.beta.threads.create()
    logging.info(f"Создан новый поток. Thread ID: {thread.id}")  # Логируем создание потока
    return jsonify({"thread_id": thread.id})

# Маршрут для отправки сообщений с проверкой на превышение лимита
@app.route('/chat', methods=['POST'])
@limiter.limit("2 per minute", exempt_when=lambda: session.get('captcha_passed', False))  # Ограничение на 5 запросов в минуту
def chat():
    data = request.json
    thread_id = data.get('thread_id')
    user_input = data.get('message', '')

    if not thread_id:
        logging.error("Отсутствует thread_id в запросе")  # Логируем ошибку
        return jsonify({"error": "Missing thread_id"}), 400

    logging.info(f"Получено сообщение: '{user_input}' с Thread ID: {thread_id}")  # Логируем сообщение пользователя

    # Если лимит превышен, перенаправляем на капчу
    if request.endpoint == 'limiter.exceeded':
        return redirect(url_for('get_captcha'))

    # Выполнение чата
    client.beta.threads.messages.create(thread_id=thread_id, role="user", content=user_input)
    run = client.beta.threads.runs.create(thread_id=thread_id, assistant_id=assistant_id)

    while True:
        run_status = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)
        if run_status.status == 'completed':
            break
        elif run_status.status == 'requires_action':
            for tool_call in run_status.required_action.submit_tool_outputs.tool_calls:
                if tool_call.function.name == "create_lead":
                    arguments = json.loads(tool_call.function.arguments)
                    output = functions.create_lead(arguments["name"], arguments["phone"], arguments["date"], arguments["service"])
                    client.beta.threads.runs.submit_tool_outputs(thread_id=thread_id, run_id=run.id, tool_outputs=[{
                        "tool_call_id": tool_call.id,
                        "output": json.dumps(output)
                    }])
        time.sleep(1)

    messages = client.beta.threads.messages.list(thread_id=thread_id)
    response = messages.data[0].content[0].text.value

    logging.info(f"Отправлен ответ ассистента: '{response}' с Thread ID: {thread_id}")  # Логируем ответ ассистента

    return jsonify({"response": response})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8085)
