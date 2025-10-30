import axios from "axios";

export default async function handler(req, res) {
  // --- CORS Setup ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // --- Environment Variables from Vercel Dashboard ---
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ID;
  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const GRAPH_URL = "https://graph.facebook.com/v19.0";

  try {
    // ✅ 1. VERIFY WEBHOOK
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verified successfully!");
        return res.status(200).send(challenge);
      } else {
        console.error("❌ Verification failed: token mismatch");
        return res.status(403).send("Verification failed");
      }
    }

    // ✅ 2. FETCH APPROVED TEMPLATES
    if (req.query.action === "templates" && req.method === "GET") {
      const response = await axios.get(
        `${GRAPH_URL}/${BUSINESS_ID}/message_templates`,
        {
          headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        }
      );
      const templates = response.data.data.filter(
        (t) => t.status === "APPROVED"
      );
      return res.status(200).json({ templates });
    }

    // ✅ 3. SEND MESSAGE
    if (req.query.action === "send" && req.method === "POST") {
      const {
        recipientNumber,
        messageType,
        messageText,
        templateName,
        components,
      } = req.body;

      const payload = {
        messaging_product: "whatsapp",
        to: recipientNumber,
      };

      if (messageType === "text") {
        payload.type = "text";
        payload.text = { body: messageText };
      } else if (messageType === "template") {
        payload.type = "template";
        payload.template = {
          name: templateName,
          language: { code: "en_IN" },
          components: components || [],
        };
      }

      const sendResponse = await axios.post(
        `${GRAPH_URL}/${PHONE_ID}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      return res.status(200).json(sendResponse.data);
    }

    // If no valid route:
    return res.status(404).json({ message: "Invalid route or method" });
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    return res
      .status(500)
      .json({ error: err.response?.data || err.message });
  }
}
