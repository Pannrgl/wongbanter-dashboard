import MetaTrader5 as mt5
import json
from flask import Flask, request
import requests

app = Flask(__name__)

# Inisialisasi MT5 tanpa login manual
def initialize():
    try:
        initialized = mt5.initialize()
        if initialized:
            print('Connected to Account TOD!')
            print('Login:', mt5.account_info().login)
            print('Server:', mt5.account_info().server)
        else:
            print('Failed to connect to MetaTrader5')
        return initialized
    except Exception as e:
        print("Exception occurred during initialization:", str(e))
        return False

# Fungsi untuk mengirim order ke MT5
def send_order(symbol, lot, order_type, price, sl_pips, tp_pips):
    deviation = 20  # Slippage maksimum
    symbol_info = mt5.symbol_info(symbol)
    
    if symbol_info is None:
        print(f"Symbol {symbol} tidak ditemukan")
        return False
    
    if not symbol_info.visible:
        if not mt5.symbol_select(symbol, True):
            print(f"Gagal memilih simbol {symbol}")
            return False
    
    # Hitung Stop Loss dan Take Profit
    sl = price - sl_pips * mt5.symbol_info(symbol).point if order_type == mt5.ORDER_TYPE_BUY else price + sl_pips * mt5.symbol_info(symbol).point
    tp = price + tp_pips * mt5.symbol_info(symbol).point if order_type == mt5.ORDER_TYPE_BUY else price - tp_pips * mt5.symbol_info(symbol).point

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": lot,
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": deviation,
        "magic": 234000,  # Magic number untuk identifikasi order
        "comment": "Order dari TradingView bot",
        "type_time": mt5.ORDER_TIME_GTC,  # Good till canceled
        "type_filling": mt5.ORDER_FILLING_FOK,  # Fill or kill
    }

    # Kirim order
    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        print(f"Order gagal, error code: {result.retcode}")
        return False
    
    print(f"Order berhasil: {result}")
    return True

# Fungsi untuk mendapatkan harga terkini dari MT5
def get_current_price(symbol):
    symbol_info_tick = mt5.symbol_info_tick(symbol)
    if symbol_info_tick is None:
        print(f"Error: Tidak dapat mengambil harga untuk simbol {symbol}")
        return None
    return symbol_info_tick.ask  # Harga terkini (untuk BUY order)

@app.route("/trade", methods=["POST"])
def home():
    json_data = request.json
    text = json_data.get("text")  # Sinyal trading (BUY/SELL)
    rugine = json_data.get("rugine", 300)  # SL (default 300 pips)
    untunge = json_data.get("untunge", 300)  # TP (default 1000 pips)

    if text and rugine and untunge:
        try:
            # Menentukan arah berdasarkan kata kunci dalam text
            if "BUY" in text:
                order_type = mt5.ORDER_TYPE_BUY
                symbol = "XAUUSD"  # Sesuaikan dengan simbol yang digunakan
                lot = 0.1  # Ukuran lot yang diinginkan
            elif "SELL" in text:
                order_type = mt5.ORDER_TYPE_SELL
                symbol = "XAUUSD"  # Sesuaikan dengan simbol yang digunakan
                lot = 0.1  # Ukuran lot yang diinginkan
            else:
                return "No valid signal in text", 400

            # Dapatkan harga terkini dari MT5
            if initialize():
                current_price = get_current_price(symbol)
                if current_price:
                    send_order(symbol, lot, order_type, current_price, float(rugine), float(untunge))
                
                    # Format pesan dengan nilai rugine dan untunge
                    message = (
                        f"\U0001F4E2 XAUUSD : {text.split(': ')[1]} {'BUY' if order_type == mt5.ORDER_TYPE_BUY else 'SELL'}\n"
                        f"{current_price}\n"
                        f"\U000026A0 Stop  : {rugine} pips \n"
                        f"\U0001F4A5 Take : {untunge}"
                    )

                    telegram_bot_sendtext(message)
                    return message
                else:
                    return "Failed to get current price", 500
        except Exception as e:
            print("Error:", e)
            return "Error processing order", 400
    else:
        return "Invalid JSON data", 400


def telegram_bot_sendtext(bot_message):
    bot_token = "REDACTED"
    bot_chatID = "REDACTED"
    send_text = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    headers = {"Content-Type": "application/json"}

    payload = {"chat_id": bot_chatID, "text": bot_message, "parse_mode": "HTML"}

    response = requests.post(send_text, headers=headers, json=payload)
    if response.status_code != 200:
        print(f"Failed to send message. Status code: {response.status_code}, Response: {response.text}")


if __name__ == "__main__":
    app.run(debug=True)
