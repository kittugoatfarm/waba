// ============================================================
// ✅ Kittu WhatsApp Chat Platform – Vercel Single Index (by Pralav)
// ============================================================

import axios from "axios";

// ✅ Environment variables from Vercel (hidden & secure)
const GRAPH_API_URL = "https://graph.facebook.com/v19.0/";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ID;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "my_vf_tkn.772528";

export default async function handler(req, res) {
  // ✅ Allow CORS for Firebase frontend
  res.setHeader("Access-Control-Allow-Origin", "https://kgfwaba.web.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).send("OK");

  try {
    // ===============================
    // 📩 1. Webhook Verification (GET)
    // ===============================
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verified!");
        return res.status(200).send(challenge);
      } else {
        return res.status(403).send("Verification failed");
      }
    }

    // ===============================
    // 🟢 2. Handle POST requests
    // ===============================
    if (req.method === "POST") {
      const { action } = req.query || {};

      // 🔹 A. Send Message
      if (action === "send") {
        const { recipientNumber, messageType, messageText, templateName, languageCode, components } = req.body || {};

        if (!ACCESS_TOKEN || !PHONE_NUMBER_ID)
          return res.status(400).json({ error: "Missing WhatsApp credentials" });

        if (!recipientNumber) return res.status(400).json({ error: "recipientNumber is required" });

        const payload = { messaging_product: "whatsapp", to: recipientNumber };

        if (messageType === "text") {
          if (!messageText) return res.status(400).json({ error: "messageText is required for text type" });
          payload.type = "text";
          payload.text = { body: messageText };
        } else if (messageType === "template") {
          if (!templateName) return res.status(400).json({ error: "templateName is required for template type" });
          payload.type = "template";
          payload.template = {
            name: templateName,
            language: { code: languageCode || "en_US" },
            components: components || [],
          };
        } else {
          return res.status(400).json({ error: "Unsupported messageType. Use 'text' or 'template'." });
        }

        const r = await axios.post(`${GRAPH_API_URL}${PHONE_NUMBER_ID}/messages`, payload, {
          headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        });

        console.log("✅ Message sent:", r.data);
        return res.status(200).json(r.data);
      }

      // 🔹 B. Get Templates
      if (action === "templates") {
        if (!ACCESS_TOKEN || !BUSINESS_ID)
          return res.status(400).json({ error: "Missing credentials" });

        const r = await axios.get(
          `${GRAPH_API_URL}${BUSINESS_ID}/message_templates`,
          { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
        );

        const approved = (r.data?.data || [])
          .filter((t) => t.status === "APPROVED")
          .map((t) => ({
            name: t.name,
            language: t.language,
            components: t.components,
          }));

        return res.status(200).json({ templates: approved });
      }

      // 🔹 C. Webhook Incoming Message (if you POST here from Meta Console)
      if (action === "webhook") {
        console.log("📩 Incoming Webhook:", JSON.stringify(req.body, null, 2));
        // You can store to Firestore or DB here if needed.
        return res.status(200).send("Webhook received");
      }

      // 🔹 D. Bulk Message (simple text)
      if (action === "bulk") {
        const { recipientNumbers, messageText } = req.body || {};

        if (!Array.isArray(recipientNumbers) || recipientNumbers.length === 0)
          return res.status(400).json({ error: "Empty recipient list" });

        if (!messageText) return res.status(400).json({ error: "messageText is required" });

        const results = [];

        for (const num of recipientNumbers) {
          const payload = {
            messaging_product: "whatsapp",
            to: num,
            type: "text",
            text: { body: messageText },
          };

          const r = await axios
            .post(`${GRAPH_API_URL}${PHONE_NUMBER_ID}/messages`, payload, {
              headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
            })
            .then((res) => ({
              to: num,
              id: res.data?.messages?.[0]?.id,
              status: "sent",
            }))
            .catch((err) => ({
              to: num,
              status: "failed",
              error: err.response?.data || err.message,
            }));

          results.push(r);
        }

        return res.status(200).json({ success: true, results });
      }

      // ❌ Unknown Action
      return res
        .status(400)
        .json({ error: "Unknown action. Use ?action=send | templates | bulk | webhook" });
    }

    return res.status(405).send("Method Not Allowed");
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
}
