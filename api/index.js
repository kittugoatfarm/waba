// ==========================================================
// ✅ Kittu WhatsApp Platform - Vercel API (By Pralav)
// ==========================================================

import axios from "axios";

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;
  const GRAPH_API_URL = "https://graph.facebook.com/v19.0";

  // ✅ CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ==========================================================
  // 1️⃣ VERIFY WEBHOOK (GET)
  // ==========================================================
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("📩 Verification Attempt:", { mode, token, challenge });

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook Verified Successfully!");
      return res.status(200).send(challenge);
    } else {
      console.log("❌ Verification Failed");
      return res.status(403).json({
        error: "Verification failed",
        received: token,
        expected: VERIFY_TOKEN,
      });
    }
  }

  // ==========================================================
  // 2️⃣ INCOMING MESSAGE HANDLER (POST)
  // ==========================================================
  if (req.method === "POST") {
    try {
      const body = req.body;
      console.log("📨 Incoming Webhook Body:", JSON.stringify(body, null, 2));

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message) {
        const from = message.from;
        const msgType = message.type;
        const msgBody =
          msgType === "text"
            ? message.text.body
            : `Received ${msgType} message.`;

        console.log(`💬 Message from ${from}: ${msgBody}`);

        // Auto reply (optional)
        const replyPayload = {
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: `🙏 Thanks for messaging Kittu Goat Farming 🐐\n\nYour message: "${msgBody}"\nWe’ll get back to you soon.` },
        };

        await axios.post(
          `${GRAPH_API_URL}/${PHONE_NUMBER_ID}/messages`,
          replyPayload,
          {
            headers: {
              Authorization: `Bearer ${ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        return res.status(200).json({ success: true });
      }

      return res.status(200).send("No message content");
    } catch (error) {
      console.error("❌ Error handling webhook:", error.response?.data || error);
      return res.status(500).json({
        error: "Internal Server Error",
        details: error.response?.data || error.message,
      });
    }
  }

  // ==========================================================
  // 3️⃣ SEND MESSAGE (Manual POST from Frontend)
  // ==========================================================
  if (req.method === "PUT") {
    try {
      const { to, message, type = "text", template } = req.body;

      if (!to) return res.status(400).json({ error: "Missing 'to' number" });

      const payload =
        type === "text"
          ? {
              messaging_product: "whatsapp",
              to,
              type: "text",
              text: { body: message },
            }
          : {
              messaging_product: "whatsapp",
              to,
              type: "template",
              template: {
                name: template?.name,
                language: { code: template?.lang || "en_US" },
                components: template?.components || [],
              },
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

      console.log("✅ Message Sent:", response.data);
      return res.status(200).json(response.data);
    } catch (error) {
      console.error("❌ Send Error:", error.response?.data || error.message);
      return res.status(500).json({
        error: "Failed to send message",
        details: error.response?.data || error.message,
      });
    }
  }

  // ==========================================================
  // ❌ Default (if route not handled)
  // ==========================================================
  return res.status(405).json({ error: "Method Not Allowed" });
}
