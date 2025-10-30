// ==========================================================
// ✅ Kittu WhatsApp API (Final Vercel Version by Pralav)
// ==========================================================

import axios from "axios";

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;
  const GRAPH_API_URL = "https://graph.facebook.com/v19.0";

  // ✅ Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ==========================================================
  // 1️⃣ VERIFY WEBHOOK (GET)
  // ==========================================================
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified successfully!");
      return res.status(200).send(challenge);
    } else {
      return res.status(403).json({ error: "Verification failed" });
    }
  }

  // ==========================================================
  // 2️⃣ INCOMING WHATSAPP MESSAGES (POST from Meta)
  // ==========================================================
  if (req.method === "POST" && req.body?.entry) {
    try {
      const entry = req.body.entry[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      if (message) {
        const from = message.from;
        const text = message.text?.body || "Received a message";

        console.log(`💬 Message from ${from}: ${text}`);

        // ✅ Auto reply
        const replyPayload = {
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: `🙏 Thanks for messaging Kittu Goat Farming 🐐\nYour message: "${text}"` },
        };

        await axios.post(`${GRAPH_API_URL}/${PHONE_NUMBER_ID}/messages`, replyPayload, {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        });

        return res.status(200).json({ success: true, received: text });
      }

      return res.status(200).send("No message received");
    } catch (error) {
      console.error("❌ Webhook error:", error.response?.data || error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  // ==========================================================
  // 3️⃣ SEND MESSAGE (Manual PUT or POST from Postman / Frontend)
  // ==========================================================
  if (req.method === "PUT" || req.method === "POST") {
    try {
      const { to, message } = req.body;

      if (!to || !message)
        return res.status(400).json({ error: "Missing 'to' or 'message'" });

      const payload = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      };

      const response = await axios.post(
        `${GRAPH_API_URL}/${PHONE_NUMBER_ID}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Message sent:", response.data);
      return res.status(200).json({ success: true, data: response.data });
    } catch (error) {
      console.error("❌ Send Error:", error.response?.data || error.message);
      return res.status(500).json({
        error: "Failed to send message",
        details: error.response?.data || error.message,
      });
    }
  }

  // ==========================================================
  // 4️⃣ INVALID METHOD
  // ==========================================================
  return res.status(405).json({ error: "Method Not Allowed" });
}
