const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // フロントエンドから送られてくる「1つ分の塊」を受け取る
    const singleChunk = JSON.parse(event.body);

    if (!singleChunk || singleChunk.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ message: '翻訳対象のデータが含まれていません。' }) };
    }

    const prompt = `あなたは優秀な翻訳アシスタントです。以下のJSON配列に含まれる各オブジェクトの'text'の値を、自然な日本語に翻訳してください。
応答は、元の'id'と翻訳後の'text'を含むJSON配列の文字列だけにしてください。他の説明文やコードブロックのマーカー(\`\`\`)は一切含めないでください。

[入力データ]
${JSON.stringify(singleChunk, null, 2)}

[出力JSON]
`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2,
      }
    };

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      throw new Error(`AI翻訳エラー (Status: ${response.status})`);
    }

    const responseData = await response.json();

    if (responseData.candidates && responseData.candidates[0].content.parts[0].text) {
      const jsonString = responseData.candidates[0].content.parts[0].text;
      // 応答がJSON形式であることを保証するためにパースしてみる
      const translatedObjects = JSON.parse(jsonString);
      // 成功したら、翻訳結果をそのまま返す
      return {
        statusCode: 200,
        body: JSON.stringify(translatedObjects)
      };
    } else {
      throw new Error("AIからの応答形式が正しくありません。");
    }

  } catch (error) {
    console.error('Handler Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'サーバーエラー: ' + error.message }),
    };
  }
};
