const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const commentsToTranslate = JSON.parse(event.body);

    if (!commentsToTranslate || commentsToTranslate.length === 0) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    // ★★★ GAS版を参考にした、一括処理用のプロンプト ★★★
    const prompt = `以下のJSON配列に含まれる各オブジェクトの'text'の値を、必ず自然な日本語に翻訳してください。
応答は、元の'id'と翻訳後の'text'を含むJSON配列の文字列だけにしてください。他の説明文やコードブロックのマーカー(\`\`\`)は一切含めないでください。

入力JSON:
${JSON.stringify(commentsToTranslate)}

出力JSON:
`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json", // AIの応答をJSON形式に強制
        temperature: 0.2,
        maxOutputTokens: 8192,
      }
    };

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error Response:", errorText);
      throw new Error(`AI翻訳でエラーが発生しました (HTTP Status: ${response.status})`);
    }

    const responseData = await response.json();

    if (responseData.candidates && responseData.candidates[0].content.parts[0].text) {
      const jsonString = responseData.candidates[0].content.parts[0].text;
      // AIが返したJSON文字列をパースして返す
      const translatedObjects = JSON.parse(jsonString);
      return {
        statusCode: 200,
        body: JSON.stringify(translatedObjects)
      };
    } else {
      console.error("Invalid response structure from Gemini API:", responseData);
      throw new Error("AI翻訳に失敗しました。APIからの応答形式が正しくありません。");
    }

  } catch (error) {
    console.error('Translation Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '翻訳処理中にサーバーでエラーが発生しました。' + error.message }),
    };
  }
};
