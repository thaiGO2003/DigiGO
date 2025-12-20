
const TELEGRAM_BOT_TOKEN = '8561189258:AAEORHmLjFNAJxhOsyFw-U5FQLVJRdqHDGc';
const TELEGRAM_CHAT_ID = '6043632866';

export const sendTelegramNotification = async (message: string) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      console.error('Failed to send Telegram notification:', await response.text());
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
};
