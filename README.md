# Kittu WhatsApp – Vercel Backend (Single File)

Free, secure proxy for WhatsApp Business Cloud API.

## Files
- `api/index.js` – single API with routes: `?action=send|templates|bulk|webhook`
- `package.json`
- `vercel.json`

## Environment Variables (Vercel → Project Settings → Environment Variables)
- `WHATSAPP_ACCESS_TOKEN` – Meta system user token
- `WHATSAPP_PHONE_NUMBER_ID` – e.g. 1234567890
- `WHATSAPP_BUSINESS_ID` – e.g. 987654321
- `WHATSAPP_VERIFY_TOKEN` – e.g. my_vf_tkn.772528

## Endpoints
- `POST /api?action=send`
- `POST /api?action=templates`
- `POST /api?action=bulk`
- `GET  /api` with hub params for webhook verification
- `POST /api?action=webhook` for receiving messages

## CORS
Allowed Origin: `https://kgfwaba.web.app` (edit in `api/index.js` if needed)
