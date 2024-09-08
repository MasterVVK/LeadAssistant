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
            <div class="chat-input-wrapper">
                <textarea id="userMessage" placeholder="Введите сообщение..." rows="1" style="height: 36px; overflow-y: hidden; padding: 8px; padding-right: 70px;"></textarea>
                <button id="sendMessage"><i class="send-icon">➤</i></button>
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

        // Добавление индикатора ожидания с анимацией
        function showLoadingIndicator() {
            const messagesDiv = document.getElementById('chatMessages');
            const loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'loadingIndicator';
            loadingIndicator.classList.add('chat-message', 'assistant', 'loading-animation');
            loadingIndicator.innerHTML = `<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>`;
            messagesDiv.appendChild(loadingIndicator);
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Прокрутка вниз
        }

        // Удаление индикатора ожидания
        function hideLoadingIndicator() {
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }

        // Отправка сообщения
        document.getElementById('sendMessage').addEventListener('click', async function () {
            sendMessage();
        });

        // Обработчик клавиши Enter для отправки сообщения
        document.getElementById('userMessage').addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault(); // Предотвращаем стандартное поведение Enter
                sendMessage();
            } else if (event.key === 'Enter' && event.shiftKey) {
                event.preventDefault(); // Добавляем перевод строки
                userMessage.value += '\n';
            }
        });

        // Динамическое изменение высоты поля ввода
        const userMessage = document.getElementById('userMessage');
        const minHeight = 36; // Минимальная высота поля ввода (одна строка)
        const maxHeight = 150; // Максимальная высота поля ввода
        userMessage.style.height = `${minHeight}px`; // Устанавливаем начальную высоту

        userMessage.addEventListener('input', function() {
            // Сброс высоты перед изменением для того, чтобы текстовое поле уменьшалось при удалении текста
            userMessage.style.height = `${minHeight}px`;
            const scrollHeight = userMessage.scrollHeight;

            // Изменяем высоту поля ввода в зависимости от его содержимого
            if (scrollHeight > minHeight) {
                userMessage.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
            }
        });

        // Функция отправки сообщения
        async function sendMessage() {
            const message = document.getElementById('userMessage').value.trim();
            if (message === '') return;

            appendMessage('user', message); // Добавление сообщения пользователя
            document.getElementById('userMessage').value = ''; // Очистка поля
            userMessage.style.height = `${minHeight}px`; // Сброс высоты после отправки

            showLoadingIndicator(); // Показываем индикатор ожидания

            try {
                const response = await fetch('https://fd.vivikey.tech/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message, thread_id }),
                });
                const data = await response.json();
                hideLoadingIndicator(); // Убираем индикатор после получения ответа
                appendMessage('assistant', data.response); // Ответ ассистента
            } catch (error) {
                hideLoadingIndicator(); // Убираем индикатор ожидания при ошибке
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

    // Стили для чата, адаптированные под бело-синий дизайн
    const style = document.createElement('style');
    style.textContent = `
        .chat-icon {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background-color: #007bff; /* Синий цвет для основной схемы */
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
            background-color: #0056b3; /* Темно-синий при наведении */
        }

        .chat-box {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 350px;
            height: 500px;
            background-color: #ffffff; /* Белый фон чата */
            border-radius: 10px;
            display: none;
            flex-direction: column;
            z-index: 9999;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            font-family: Arial, sans-serif; /* Основной шрифт сайта */
        }

        .chat-box.show {
            display: flex;
        }

        .chat-header {
            background-color: #007bff; /* Синий заголовок чата */
            color: white;
            padding: 15px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            border-radius: 10px 10px 0 0;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .chat-messages {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            background-color: #f5f5f5; /* Светлый фон сообщений */
            color: black;
            font-size: 16px;
        }

        .chat-input-wrapper {
            display: flex;
            padding: 10px;
            background-color: #fff; /* Белый фон ввода */
            border-top: 1px solid #ddd;
            position: relative;
        }

        .chat-input-wrapper textarea {
            flex: 1;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 10px;
            resize: none;
            background-color: #f1f1f1;
            font-size: 16px;
            min-height: 36px;
            max-height: 150px;
            overflow-y: hidden;
            padding-right: 70px;
        }

        .chat-input-wrapper button {
            position: absolute;
            right: 15px; /* Увеличиваем отступ справа */
            top: 50%;
            transform: translateY(-50%);
            background-color: #007bff; /* Синий цвет кнопки */
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-size: 18px;
            cursor: pointer;
        }

        .send-icon {
            font-size: 18px;
            line-height: 18px;
        }

        .chat-message {
            margin-bottom: 10px;
            padding: 12px;
            border-radius: 8px;
            background-color: #e0e0e0; /* Светло-серый фон сообщений */
            color: black;
            word-wrap: break-word;
        }

        .chat-message.user {
            background-color: #007bff; /* Синий цвет сообщений пользователя */
            color: white;
            text-align: right;
        }

        .chat-message.assistant {
            background-color: #f5f5f5;
            color: black;
            text-align: left;
        }

        #loadingIndicator {
            color: gray;
            font-style: italic;
            display: flex;
            align-items: center;
        }

        .loading-animation .dot {
            animation: blink 1s infinite;
        }

        .loading-animation .dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .loading-animation .dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes blink {
            0% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
})();
