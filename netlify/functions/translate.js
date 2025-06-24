// Googleの公式ライブラリをインポート
const { GoogleGenerativeAI } = require("@google/generative-ai");

// APIキーを使って、AIクライアントを初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite"});

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

    // ★★★ 公式ライブラリを使って、コンテンツを生成 ★★★
    const result = await model.generateContent(prompt);
    const response = result.response;

    if (response && response.text()) {
      const jsonString = response.text();
      const translatedObjects = JSON.parse(jsonString);
      return {
        statusCode: 200,
        body: JSON.stringify(translatedObjects)
      };
    } else {
      // 応答が予期した形式でない場合
      console.error("Invalid response structure from Gemini API:", response);
      throw new Error("AI翻訳に失敗しました。APIからの応答形式が正しくありません。");
    }

  } catch (error) {
    console.error('Handler Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '翻訳処理中にサーバーでエラーが発生しました。' + error.message }),
    };
  }
};
