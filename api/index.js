export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  // ✅ Step 1: Print the token to console and in response
  console.log("🔥 VERIFY_TOKEN from env:", VERIFY_TOKEN);
  console.log("🟢 Query params:", req.query);

  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("👉 Mode:", mode);
    console.log("👉 Token from Meta:", token);
    console.log("👉 Challenge:", challenge);

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified successfully!");
      return res.status(200).send(challenge);
    } else {
      console.log("❌ Verification failed – token mismatch");
      return res
        .status(403)
        .json({
          error: "Verification failed",
          yourToken: token,
          expectedToken: VERIFY_TOKEN,
        });
    }
  }

  res.status(405).json({ message: "Method not allowed" });
}
