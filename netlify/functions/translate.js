const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
  console.log("--- translate.js function handler started ---");

  if (event.httpMethod !== 'POST') {
    console.log("Error: Method was not POST.");
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error("FATAL: GEMINI_API_KEY environment variable is not set.");
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    // ★★★ キーが読み込めているか、安全な形でログに出力 ★★★
    console.log("GEMINI_API_KEY loaded successfully (first 5 chars):", GEMINI_API_KEY.substring(0, 5));

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    console.log("Gemini API URL constructed.");

    const commentsToTranslate = JSON.parse(event.body);
    console.log(`Received ${commentsToTranslate.length} comments to translate.`);

    if (!commentsToTranslate || commentsToTranslate.length === 0) {
      console.log("No comments to translate, exiting.");
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const prompt = `以下のJSON配列に含まれる各オブジェクトの'text'の値を、必ず自然な日本語に翻訳してください。応答は、元の'id'と翻訳後の'text'を含むJSON配列の文字列だけにしてください。他の説明文やコードブロックのマーカー(\`\`\`)は一切含めないでください。\n\n入力JSON:\n${JSON.stringify(commentsToTranslate)}\n\n出力JSON:\n`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2,
      }
    };
    console.log("Payload for Gemini API created. Sending request...");

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(`Received response from Gemini API with status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API returned an error:", errorText);
      throw new Error(`AI翻訳でエラーが発生しました (HTTP Status: ${response.status})`);
    }

    const responseData = await response.json();
    console.log("Successfully parsed JSON response from Gemini.");

    if (responseData.candidates && responseData.candidates[0].content.parts[0].text) {
      const jsonString = responseData.candidates[0].content.parts[0].text;
      console.log("Extracted translated JSON string from API response.");
      const translatedObjects = JSON.parse(jsonString);
      console.log("Successfully parsed the final translated JSON. Returning to client.");
      return {
        statusCode: 200,
        body: JSON.stringify(translatedObjects)
      };
    } else {
      console.error("Invalid response structure from Gemini API:", responseData);
      throw new Error("AI翻訳に失敗しました。APIからの応答形式が正しくありません。");
    }

  } catch (error) {
    console.error("--- ERROR caught in handler ---", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'サーバーで予期せぬエラーが発生しました。詳細はサーバーログを確認してください。' }),
    };
  }
};
