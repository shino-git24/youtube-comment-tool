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

    const prompt = `以下のJSON配列に含まれる各オブジェクトの'text'の値を、必ず自然な日本語に翻訳してください。応答は、元の'id'と翻訳後の'text'を含むJSON配列の文字列だけにしてください。他の説明文やコードブロックのマーカー(\`\`\`)は一切含めないでください。\n\n入力JSON:\n${JSON.stringify(commentsToTranslate)}\n\n出力JSON:\n`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2,
      }
    };

    let fetchResponse;
    try {
      console.log("Attempting to fetch Gemini API...");
      fetchResponse = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 9000 // ★★★ 9秒でタイムアウトするように設定 ★★★
      });
      console.log(`Fetch attempt completed with status: ${fetchResponse.status}`);
    } catch (fetchError) {
      // ★★★ fetch自体が失敗した場合のエラーログ ★★★
      console.error("Fetch to Gemini API FAILED:", fetchError);
      throw new Error(`Gemini APIへのネットワークリクエストに失敗しました: ${fetchError.message}`);
    }

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error("Gemini API returned non-OK response:", errorText);
      throw new Error(`AI翻訳でエラーが発生しました (HTTP Status: ${fetchResponse.status})`);
    }

    const responseData = await fetchResponse.json();
    console.log("Successfully parsed JSON response from Gemini.");
    
    if (responseData.candidates && responseData.candidates[0].content.parts[0].text) {
      const jsonString = responseData.candidates[0].content.parts[0].text;
      const translatedObjects = JSON.parse(jsonString);
      return {
        statusCode: 200,
        body: JSON.stringify(translatedObjects)
      };
    } else {
      throw new Error("AI翻訳に失敗しました。APIからの応答形式が正しくありません。");
    }

  } catch (error) {
    console.error('Handler Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '翻訳処理中にサーバーでエラーが発生しました。' + error.message }),
    };
  }
};
