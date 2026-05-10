const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const API = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendMessage(chatId: string | number, text: string, extra?: object) {
  return fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  })
}

export async function setWebhook(url: string) {
  return fetch(`${API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, allowed_updates: ['message'] }),
  })
}
