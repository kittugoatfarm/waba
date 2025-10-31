import axios from "axios";

export default async function handler(req, res) {
  // ----------------------------
  // 🔧 Configuration
  // ----------------------------
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const GRAPH_API_URL = "https://graph.facebook.com/v19.0";
  const BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ID;

  // ✅ Allow CORS (important for frontend)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // ----------------------------
  // 🏠 Default Home Route
  // ----------------------------
  if (req.url === "/" && req.method === "GET") {
    return res
      .status(200)
      .send("✅ Kittu WhatsApp API Server is Live and Connected to Meta!");
  }

  // ----------------------------
  // 🔹 Webhook Verification (Meta GET)
  // ----------------------------
  if (req.method === "GET" && req.query["hub.mode"] === "subscribe") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified successfully");
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send("Verification failed");
    }
  }

  // ----------------------------
  // 💬 Handle POST requests
  // ----------------------------
  if (req.method === "POST") {
    const action = req.query.action;

    try {
      // ----------------------------
      // 🟢 1. Send single message
      // ----------------------------
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
        } else {
          return res.status(400).json({ error: "Unsupported messageType. Use 'text' or 'template'." });
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

        console.log("✅ Message sent:", response.data);
        return res.status(200).json(response.data);
      }

if (action === "templates") {
  const response = await axios.get(
    `${GRAPH_API_URL}/${BUSINESS_ACCOUNT_ID}/message_templates`,
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    }
  );

  // ✅ सिर्फ approved वाले templates और details दो
  const approved = response.data.data
    .filter((t) => t.status === "APPROVED")
    .map((t) => ({
      name: t.name,
      category: t.category,
      language: t.language,
      components: t.components,
    }));

  console.log(`✅ Templates fetched: ${approved.length}`);
  return res.status(200).json({ templates: approved });
}


      // ----------------------------
      // 🧩 3. Bulk message sending
      // ----------------------------
      if (action === "bulk") {
        const { numbers, messageText } = req.body;
        if (!Array.isArray(numbers) || numbers.length === 0)
          return res.status(400).json({ error: "numbers array required" });

        const results = await Promise.all(
          numbers.map(async (num) => {
            try {
              const response = await axios.post(
                `${GRAPH_API_URL}/${PHONE_NUMBER_ID}/messages`,
                {
                  messaging_product: "whatsapp",
                  to: num,
                  type: "text",
                  text: { body: messageText || "Hello from Kittu Goat Farm 🐐✨" },
                },
                {
                  headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                  },
                }
              );
              return { number: num, success: true, id: response.data.messages[0].id };
            } catch (err) {
              return { number: num, success: false, error: err.response?.data || err.message };
            }
          })
        );

        return res.status(200).json({ message: "Bulk process complete", results });
      }

if (action === "webhook") {
  console.log("📩 Incoming webhook:", JSON.stringify(req.body, null, 2));

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const msg = value?.messages?.[0];

    if (msg) {
      const from = msg.from;
      const text = msg.text?.body || "[non-text message]";
      const type = msg.type;

      // ✅ Firestore save
      const admin = (await import("firebase-admin")).default;
      if (!admin.apps.length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }

      const db = admin.firestore();
      await db.collection("conversations").add({
        from,
        to: "You",
        text,
        type,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`💾 Saved incoming message from ${from}: ${text}`);
    }
  } catch (err) {
    console.error("❌ Webhook save error:", err.message);
  }

  return res.status(200).send("Webhook received!");
}

      // ----------------------------
      // ❌ Unknown action
      // ----------------------------
      return res.status(400).json({
        error: "Unknown action. Use ?action=send | templates | bulk | webhook",
      });
    } catch (err) {
      console.error("❌ Error:", err.response?.data || err.message);
      return res.status(500).json({ error: err.response?.data || err.message });
    }
  }

  // ----------------------------
  // ❌ Invalid Method
  // ----------------------------
  return res.status(405).send("Method Not Allowed");
}
