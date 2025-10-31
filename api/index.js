import axios from "axios";
import admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const GRAPH_API_URL = "https://graph.facebook.com/v19.0";
  const BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ID;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // 🏠 Default route
  if (req.url === "/" && req.method === "GET") {
    return res.status(200).send("✅ Kittu WhatsApp API Server is Live and Connected to Meta!");
  }

  // 🔹 Webhook verification
  if (req.method === "GET" && req.query["hub.mode"] === "subscribe") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode && token === VERIFY_TOKEN) return res.status(200).send(challenge);
    else return res.status(403).send("Verification failed");
  }

  // 💬 POST requests (actions)
  if (req.method === "POST") {
    const action = req.query.action;
    try {
      // 🟢 Send single message
      if (action === "send") {
        const { recipientNumber, messageType, messageText, templateName, components } = req.body;

        if (!recipientNumber) return res.status(400).json({ error: "recipientNumber is required" });
        if (!messageType) return res.status(400).json({ error: "messageType is required" });

        const payload = {
          messaging_product: "whatsapp",
          to: recipientNumber,
        };

        if (messageType === "text") {
          payload.type = "text";
          payload.text = { body: messageText || "Hello from Kittu Goat Farm 🐐✨" };
        } else if (messageType === "template") {
          if (!templateName) return res.status(400).json({ error: "templateName is required" });
          payload.type = "template";
          payload.template = {
            name: templateName,
            language: { code: "en_US" },
            components: components || [],
          };
        }

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

        // 🟢 Save sent message to Firestore
        await db.collection("conversations").add({
          from: "You",
          to: recipientNumber,
          text: messageText,
          type: messageType,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log("✅ Message sent:", response.data);
        return res.status(200).json(response.data);
      }

      // 🟡 Get templates
      if (action === "templates") {
        const response = await axios.get(
          `${GRAPH_API_URL}/${BUSINESS_ACCOUNT_ID}/message_templates`,
          {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
          }
        );
        const approved = response.data.data.filter((t) => t.status === "APPROVED");
        return res.status(200).json({ templates: approved });
      }

      // 🔵 Webhook (incoming messages)
      if (action === "webhook") {
        const body = req.body;
        console.log("📩 Incoming webhook:", JSON.stringify(body, null, 2));

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        // 📥 Handle incoming messages
        const msg = value?.messages?.[0];
        if (msg) {
          const from = msg.from;
          const text = msg.text?.body || "[non-text message]";
          await db.collection("conversations").add({
            from,
            to: "You",
            text,
            type: msg.type,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`💾 Message saved from ${from}: ${text}`);
        }

        return res.status(200).send("Webhook received!");
      }

      // ❌ Unknown action
      return res.status(400).json({
        error: "Unknown action. Use ?action=send | templates | webhook",
      });
    } catch (err) {
      console.error("❌ Error:", err.response?.data || err.message);
      return res.status(500).json({ error: err.response?.data || err.message });
    }
  }

  return res.status(405).send("Method Not Allowed");
}
