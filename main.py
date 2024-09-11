import json
import os
import time
import random
import openai
from flask import Flask, jsonify, request, session, redirect, url_for
from openai import OpenAI
import functions
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

OPENAI_API_KEY = os.environ['OPENAI_API_KEY']

# Проверка версии OpenAI
from packaging import version

required_version = version.parse("1.1.1")
current_version = version.parse(openai.__version__)

if current_version < required_version:
    raise ValueError(
        f"Error: OpenAI version {openai.__version__} is less than the required version 1.1.1"
    )
else:
    print("OpenAI version is compatible.")

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Секретный ключ для сессий

client = OpenAI(api_key=OPENAI_API_KEY)

# Инициализация Flask-Limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["5 per minute"]  # Лимит 5 запросов в минуту
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
    session['captcha_answer'] = answer  # Сохраняем правильный ответ в сессии
    return question

# API для получения вопроса капчи
@app.route('/get-captcha', methods=['GET'])
def get_captcha():
    question = generate_captcha()
    return jsonify({"question": question})

# API для проверки ответа на капчу
@app.route('/check-captcha', methods=['POST'])
def check_captcha():
    user_answer = int(request.json.get('answer', 0))
    if user_answer == session.get('captcha_answer'):
        # Если капча пройдена, сбрасываем лимит для текущего запроса
        session['captcha_passed'] = True
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": "Неправильный ответ. Попробуйте снова."})

# Стартовый маршрут для потока обсуждения
@app.route('/start', methods=['GET'])
@limiter.limit("2 per minute")
def start_conversation():
    thread = client.beta.threads.create()
    return jsonify({"thread_id": thread.id})

# Маршрут для чата с проверкой на превышение лимита
@app.route('/chat', methods=['POST'])
@limiter.limit("5 per minute", exempt_when=lambda: session.get('captcha_passed', False))
def chat():
    data = request.json
    thread_id = data.get('thread_id')
    user_input = data.get('message', '')

    if not thread_id:
        return jsonify({"error": "Missing thread_id"}), 400

    # Если лимит превышен, перенаправляем пользователя на капчу
    if request.endpoint == 'limiter.exceeded':
        return redirect(url_for('get_captcha'))

    # Если лимит не превышен, продолжаем выполнение запроса
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

    return jsonify({"response": response})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8085)
