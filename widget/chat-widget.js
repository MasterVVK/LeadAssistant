(function() {
    window.addEventListener('load', function() {
        var chatConfig = window.chatConfig || {
            url: 'https://default-url.com', // Замените на ваш URL
            startEndpoint: '/start',
            chatEndpoint: '/chat',
            widgetSrc: 'https://default-url.com/widget/chat-widget.js' // Путь к виджету
        };

        const chatIcon = document.createElement('div');
        chatIcon.classList.add('chat-icon');
        chatIcon.innerHTML = '💬';
        document.body.appendChild(chatIcon);

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

        chatIcon.addEventListener('click', function() {
            chatBox.classList.toggle('show');
        });

        let thread_id = localStorage.getItem('thread_id');

        async function initThread() {
            if (!thread_id) {
                const response = await fetch(chatConfig.url + chatConfig.startEndpoint);
                const data = await response.json();
                thread_id = data.thread_id;
                localStorage.setItem('thread_id', thread_id);
            }
        }

        setTimeout(initThread, 500);

        // Функция запроса капчи с сервера
        async function fetchCaptcha() {
            try {
                const response = await fetch('/get-captcha');
                const data = await response.json();
                return data.question;
            } catch (error) {
                console.error("Ошибка при запросе капчи:", error);
                return null;
            }
        }

        // Функция для проверки ответа на капчу
        async function verifyCaptcha(answer) {
            try {
                const response = await fetch('/check-captcha', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ answer: answer }),
                });
                const data = await response.json();
                return data.success;
            } catch (error) {
                console.error("Ошибка при проверке капчи:", error);
                return false;
            }
        }

        // Проверка капчи, если сервер вернет ошибку лимита (статус 429)
        async function handleCaptchaIfNeeded(response) {
            if (response.status === 429) {  // Если сервер вернул ошибку лимита
                const captchaQuestion = await fetchCaptcha();
                if (captchaQuestion) {
                    const captchaAnswer = prompt(captchaQuestion);  // Окно для ввода ответа на капчу
                    const isCorrect = await verifyCaptcha(captchaAnswer);

                    if (isCorrect) {
                        alert("Капча пройдена!");
                        return true;
                    } else {
                        alert("Неправильный ответ. Попробуйте снова.");
                        return false;
                    }
                } else {
                    alert("Ошибка при загрузке капчи.");
                    return false;
                }
            }
            return true;  // Если лимит не превышен
        }

        // Отправка сообщения
        async function sendMessage() {
            const message = document.getElementById('userMessage').value.trim();
            if (message === '') return;

            appendMessage('user', message);  // Добавление сообщения пользователя
            document.getElementById('userMessage').value = '';  // Очистка поля

            showLoadingIndicator();  // Показываем индикатор ожидания

            try {
                const response = await fetch(chatConfig.url + chatConfig.chatEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message, thread_id }),
                });

                // Проверяем, требуется ли капча (если сервер вернул статус 429)
                if (await handleCaptchaIfNeeded(response)) {
                    const data = await response.json();
                    let assistantMessage = data.response.replace(/\【.*?\】/g, '');  // Убираем лишние символы
                    hideLoadingIndicator();  // Убираем индикатор после получения ответа
                    appendMessage('assistant', assistantMessage);  // Ответ ассистента
                } else {
                    hideLoadingIndicator();  // Убираем индикатор ожидания при ошибке капчи
                    appendMessage('assistant', 'Ошибка при прохождении капчи.');
                }

            } catch (error) {
                hideLoadingIndicator();  // Убираем индикатор при ошибке
                appendMessage('assistant', 'Ошибка при отправке сообщения.');
            }
        }

        // Функция добавления сообщений в чат
        function appendMessage(sender, message) {
            const messagesDiv = document.getElementById('chatMessages');
            const newMessage = document.createElement('div');
            newMessage.classList.add('chat-message', sender);
            newMessage.innerHTML = message.replace(/\n/g, '<br>');  // Поддержка перевода строки
            messagesDiv.appendChild(newMessage);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;  // Прокрутка вниз
        }

        // Показываем индикатор загрузки
        function showLoadingIndicator() {
            const messagesDiv = document.getElementById('chatMessages');
            const loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'loadingIndicator';
            loadingIndicator.classList.add('chat-message', 'assistant', 'loading-animation');
            loadingIndicator.innerHTML = `<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>`;
            messagesDiv.appendChild(loadingIndicator);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // Убираем индикатор загрузки
        function hideLoadingIndicator() {
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }

        // Обработчик кнопки отправки сообщения
        document.getElementById('sendMessage').addEventListener('click', sendMessage);

        // Обработчик нажатия Enter для отправки сообщения
        document.getElementById('userMessage').addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();  // Предотвращаем перенос строки
                sendMessage();  // Отправка сообщения
            }
        });

        const userMessage = document.getElementById('userMessage');
        const minHeight = 36;
        const maxHeight = 150;
        userMessage.style.height = `${minHeight}px`;

        // Автоматическое изменение высоты поля ввода
        userMessage.addEventListener('input', function() {
            userMessage.style.height = `${minHeight}px`;  // Сброс высоты перед изменением
            const scrollHeight = userMessage.scrollHeight;

            if (scrollHeight > minHeight) {
                userMessage.style.height = `${Math.min(scrollHeight, maxHeight)}px`;  // Изменение высоты поля ввода
            }
        });
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
            color: #007bff; /* Сделаем точки ярко-синими */
            font-style: italic;
            display: flex;
            align-items: center;
            font-size: 24px; /* Увеличим размер точек */
        }

        .loading-animation .dot {
            display: inline-block;
            font-size: 24px; /* Увеличим размер точек */
            margin-right: 2px;
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
