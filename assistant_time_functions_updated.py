
import datetime
import pytz

def get_current_time(timezone_str='Europe/Moscow'):
    timezone = pytz.timezone(timezone_str)
    now = datetime.datetime.now(pytz.utc).astimezone(timezone)
    return now.strftime('%Y-%m-%d %H:%M:%S')

def get_current_date(timezone_str='Europe/Moscow'):
    timezone = pytz.timezone(timezone_str)
    now = datetime.datetime.now(pytz.utc).astimezone(timezone)
    return now.strftime('%Y-%m-%d')

def handle_user_input(user_input):
    if "какая сегодня дата" in user_input.lower():
        current_date = get_current_date()  # Default to Moscow timezone
        response = f"Сегодня {current_date}."
    elif "сколько сейчас времени" in user_input.lower():
        current_time = get_current_time()  # Default to Moscow timezone
        response = f"Сейчас {current_time} по местному времени."
    else:
        response = "Извините, я не понимаю ваш запрос."
    return response

# Пример использования
if __name__ == "__main__":
    user_query = "Какая сегодня дата?"
    print(handle_user_input(user_query))
