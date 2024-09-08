(function() {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM полностью загружен');

        // Добавляем стили для чата
        const style = document.createElement('style');
        style.textContent = `
            .chat-icon {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                background-color: #5cb85c;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                color: white;
                font-size: 30px;
                z-index: 9999;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            .chat-box {
                position: fixed;
                bottom: 80px;
                right: 20px;
                width: 300px;
                height: 400px;
                background-color: white;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                border-radius: 10px;
                display: none; /* Скрыть чат по умолчанию */
                flex-direction: column;
                z-index: 9999;
            }
            .chat-box.show {
                display: flex; /* Показать чат */
            }
            .chat-header {
                background-color: #5cb85c;
                color: white;
                padding: 10px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }
            .chat-messages {
                flex: 1;
                padding: 10px;
                overflow-y: auto;
            }
            .chat-input {
                display: flex;
                padding: 10px;
                background-color: #f9f9f9;
            }
            .chat-input input {
                flex: 1;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
            }
            .chat-input button {
                background-color: #5cb85c;
                color: white;
                padding: 10px;
                border: none;
                border-radius: 5px;
                margin-left: 10px;
                cursor: pointer;
            }
            .chat-input button:hover {
                background-color: #4cae4c;
            }
        `;
        document.head.appendChild(style);
        console.log('Стили добавлены');

        // Создание иконки чата
        const chatIcon = document.createElement('div');
        chatIcon.classList.add('chat-icon');
        chatIcon.innerHTML = '💬';
        document.body.appendChild(chatIcon);
        console.log('Иконка чата добавлена');

        // Создание окна чата
        const chatBox = document.createElement('div');
        chatBox.classList.add('chat-box');
        chatBox.innerHTML = `
            <div class="chat-header">AI Chat Assistant</div>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input">
                <input type="text" id="userMessage" placeholder="Введите сообщение...">
                <button id="sendMessage">Отправить</button>
            </div>
        `;
        document.body.appendChild(chatBox);
        console.log('Окно чата добавлено');

        // Обработчик клика для открытия и закрытия чата
        chatIcon.addEventListener('click', function() {
            console.log('Клик по иконке чата');
            if (chatBox.classList.contains('show')) {
                chatBox.classList.remove('show');
                console.log('Окно чата закрыто');
            } else {
                chatBox.classList.add('show');
                console.log('Окно чата открыто');
            }
        });

        // Инициализация thread_id
        let thread_id = localStorage.getItem('thread_id');
        console.log(`Инициализация thread_id: ${thread_id}`);

        // Функция для инициализации нового потока (если его нет)
        async function initThread() {
            if (!thread_id) {
                console.log('Создание нового потока');
                const response = await fetch('https://fd.vivikey.tech/start');
                const data = await response.json();
                thread_id = data.thread_id;
                localStorage.setItem('thread_id', thread_id);
                console.log(`Новый thread_id: ${thread_id}`);
            } else {
                console.log(`thread_id уже существует: ${thread_id}`);
            }
        }

        // Ожидание полной загрузки чата перед инициализацией
        setTimeout(initThread, 500);

        // Функция для отправки сообщений на сервер
        document.getElementById('sendMessage').addEventListener('click', async function() {
            const message = document.getElementById('userMessage').value.trim();
            if (message === '') return;

            // Добавляем сообщение пользователя в чат
            appendMessage('Вы', message);
            document.getElementById('userMessage').value = '';
            console.log(`Сообщение отправлено: ${message}`);

            try {
                const response = await fetch('https://fd.vivikey.tech/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message, thread_id }),
                });
                const data = await response.json();
                appendMessage('Ассистент', data.response);
                console.log(`Ответ ассистента: ${data.response}`);
            } catch (error) {
                appendMessage('Ошибка', 'Произошла ошибка при отправке сообщения.');
                console.error('Ошибка при отправке сообщения:', error);
            }
        });

        // Функция для добавления сообщений в чат
        function appendMessage(sender, message) {
            const messagesDiv = document.getElementById('chatMessages');
            const newMessage = document.createElement('div');
            newMessage.textContent = `${sender}: ${message}`;
            messagesDiv.appendChild(newMessage);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            console.log(`Сообщение добавлено: ${sender}: ${message}`);
        }
    });
})();
