# Vapi phone booking (BookRing demo)

Connect your [BookRing assistant](https://dashboard.vapi.ai/assistants/62cc8a69-c0d5-4efb-a6b5-584c41b6d190) to inbound phone calls and optional booking tools.

## 1. Phone number (required for “call to book”)

1. Open [Vapi → Phone Numbers](https://dashboard.vapi.ai/phone-numbers).
2. Create or select a number.
3. Set **Inbound assistant** to `62cc8a69-c0d5-4efb-a6b5-584c41b6d190`.
4. Copy the number into **demo.html → Connect** or **business.html** (Vapi inbound number).

Callers who dial that number reach your assistant—not the generic Vapi demo bot.

## 2. Booking tools (optional)

Run the local webhook:

```bash
cd integrations/vapi
npm run webhook
```

Expose it (example with ngrok):

```bash
ngrok http 3848
```

In [Vapi → Tools](https://dashboard.vapi.ai/), create two **Function** tools pointing at `https://YOUR-NGROK-URL/webhook`:

| Tool name | Parameters | Purpose |
|-----------|------------|---------|
| `list_available_slots` | none | Returns sample open times |
| `book_appointment` | `customer_name`, `service`, `date`, `time` | Confirms a booking |

Add both tools to your assistant. The demo page polls `http://127.0.0.1:3848/api/bookings` for recent phone bookings.

## 3. Browser test

Use the **public** API key (Dashboard → API Keys) in `assets/vapi-demo.config.js` or the Connect tab. The official `<vapi-widget assistant-id="...">` loads your assistant by ID.

Do **not** commit private API keys.
