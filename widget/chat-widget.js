(function() {
    document.addEventListener('DOMContentLoaded', function() {
        // Создание иконки чата
        const chatIcon = document.createElement('div');
        chatIcon.classList.add('chat-icon');
        chatIcon.innerHTML = '💬';
        document.body.appendChild(chatIcon);

        // Создание окна чата
        const chatBox = document.createElement('div');
        chatBox.classList.add('chat-box');
        chatBox.innerHTML = `
            <div class="chat-header">AI Chat Assistant</div>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input">
                <textarea id="userMessage" placeholder="Введите сообщение..." rows="1"></textarea>
                <button id="sendMessage">Отправить</button>
            </div>
        `;
        document.body.appendChild(chatBox);

        // Открытие/закрытие чата
        chatIcon.addEventListener('click', function() {
            chatBox.classList.toggle('show');
        });

        // Инициализация thread_id
        let thread_id = localStorage.getItem('thread_id');

        async function initThread() {
            if (!thread_id) {
                const response = await fetch('https://fd.vivikey.tech/start');
                const data = await response.json();
                thread_id = data.thread_id;
                localStorage.setItem('thread_id', thread_id);
            }
        }

        // Инициализация потока
        setTimeout(initThread, 500);

        // Отправка сообщения
        document.getElementById('sendMessage').addEventListener('click', async function () {
            sendMessage();
        });

        // Обработчик клавиши Enter для отправки сообщения
        document.getElementById('userMessage').addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault(); // Предотвращаем стандартное поведение Enter
                sendMessage();
            }
        });

        // Функция отправки сообщения
        async function sendMessage() {
            const message = document.getElementById('userMessage').value.trim();
            if (message === '') return;

            appendMessage('user', message); // Добавление сообщения пользователя
            document.getElementById('userMessage').value = ''; // Очистка поля

            try {
                const response = await fetch('https://fd.vivikey.tech/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message, thread_id }),
                });
                const data = await response.json();
                appendMessage('assistant', data.response); // Ответ ассистента
            } catch (error) {
                appendMessage('assistant', 'Ошибка при отправке сообщения.');
            }
        }

        // Функция добавления сообщений в чат
        function appendMessage(sender, message) {
            const messagesDiv = document.getElementById('chatMessages');
            const newMessage = document.createElement('div');
            newMessage.classList.add('chat-message', sender);
            newMessage.innerHTML = message.replace(/\n/g, '<br>'); // Поддержка перевода строки
            messagesDiv.appendChild(newMessage);
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Прокрутка вниз
        }
    });

    // Стили
    const style = document.createElement('style');
    style.textContent = `
        .chat-icon {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background-color: #4CAF50;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            color: white;
            font-size: 30px;
            z-index: 9999;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            transition: background-color 0.3s ease;
        }

        .chat-icon:hover {
            background-color: #45a049;
        }

        .chat-box {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 350px;
            height: 500px;
            background-color: #fff;
            border-radius: 10px;
            display: none;
            flex-direction: column;
            z-index: 9999;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .chat-box.show {
            display: flex;
        }

        .chat-header {
            background-color: #4CAF50;
            color: white;
            padding: 15px;
            font-size: 16px;
            text-align: center;
            border-radius: 10px 10px 0 0;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .chat-messages {
            flex: 1;
            padding: 10px;
            overflow-y: auto;
            background-color: #f7f7f7;
            color: black;
        }

        .chat-input {
            display: flex;
            padding: 10px;
            background-color: #fff;
            border-top: 1px solid #ddd;
        }

        .chat-input textarea {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            resize: none;
            background-color: #f1f1f1;
            font-size: 14px;
        }

        .chat-input button {
            background-color: #4CAF50;
            color: white;
            padding: 10px;
            border: none;
            border-radius: 5px;
            margin-left: 10px;
            cursor: pointer;
            font-size: 14px;
            min-width: 80px;
        }

        .chat-input button:hover {
            background-color: #45a049;
        }

        .chat-message {
            margin-bottom: 10px;
            padding: 10px;
            border-radius: 10px;
            background-color: #e0e0e0;
            color: black;
            word-wrap: break-word;
        }

        .chat-message.user {
            background-color: #4CAF50;
            color: white;
            text-align: right;
        }

        .chat-message.assistant {
            background-color: #f1f1f1;
            color: black;
            text-align: left;
        }
    `;
    document.head.appendChild(style);
})();
