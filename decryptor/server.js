import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "50mb" }));

const API_KEY = process.env.DECRYPT_API_KEY || "";
app.use((req, res, next) => {
  const key = req.header("X-Api-Key") || req.body?.apiKey;
  if (API_KEY && key !== API_KEY) return res.status(401).json({ error: "Unauthorized" });
  next();
});

app.post("/decrypt", (req, res) => {
  try {
    const { mediaKey, base64 } = req.body || {};
    if (!mediaKey || !base64) {
      return res.status(400).json({ error: "mediaKey and base64 are required" });
    }

    const encBuf = Buffer.from(base64, "base64");
    const key = Buffer.from(mediaKey, "base64");

    if (!encBuf.length || !key.length) {
      return res.status(400).json({ error: "Invalid mediaKey or base64 payload" });
    }

    // HKDF (WhatsApp Audio)
    const info = Buffer.from("WhatsApp Audio Keys");
    const salt = Buffer.alloc(32, 0);

    // 👉 garante Buffer (alguns ambientes retornam ArrayBuffer/TypedArray)
    let expanded = crypto.hkdfSync("sha256", key, salt, info, 112);
    if (!(expanded instanceof Buffer)) expanded = Buffer.from(expanded);

    if (typeof expanded.subarray !== "function" || expanded.length < 80) {
      return res.status(500).json({ error: "HKDF failed; invalid expanded key material" });
    }

    const iv     = expanded.subarray(0, 16);
    const cKey   = expanded.subarray(16, 48); // cipherKey
    const macKey = expanded.subarray(48, 80);

    if (encBuf.length <= 10) {
      return res.status(400).json({ error: "Encrypted payload too short" });
    }
    const mac      = encBuf.subarray(encBuf.length - 10);
    const fileData = encBuf.subarray(0, encBuf.length - 10);

    // HMAC-SHA256(iv || fileData) → take first 10 bytes
    const h = crypto.createHmac("sha256", macKey);
    h.update(iv);
    h.update(fileData);
    const macCalc = h.digest().subarray(0, 10);

    if (!mac.equals(macCalc)) {
      return res.status(400).json({ error: "MAC mismatch (bad mediaKey or file)" });
    }

    const decipher  = crypto.createDecipheriv("aes-256-cbc", cKey, iv);
    const decrypted = Buffer.concat([decipher.update(fileData), decipher.final()]);

    return res.json({
      ogg_base64: decrypted.toString("base64"),
      mime: "audio/ogg",
      filename: "voice.ogg",
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get("/health", (_, res) => res.json({ ok: true }));
app.listen(4000, () => console.log("Decrypt server :4000"));