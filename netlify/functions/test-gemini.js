// translate.jsからAPIキーとURLの定義を拝借
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

exports.handler = async (event) => {
  // APIキーが設定されているか最初に確認
  if (!GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not set in environment variables.');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'サーバーエラー: APIキーが設定されていません。' })
    };
  }

  // Gemini APIに送信する、非常にシンプルなリクエストデータ
  const testPayload = {
    contents: [{
      parts: [{
        text: "Translate the word 'Hello' into Japanese. Respond with only the translated word in a JSON object like this: {\"translation\": \"こんにちは\"}"
      }]
    }],
    generationConfig: {
      response_mime_type: "application/json",
    }
  };

  try {
    console.log('Sending request to Gemini API...');
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const responseData = await response.json();

    // APIからエラーが返ってきた場合の処理
    if (!response.ok) {
      console.error('Gemini API returned an error:', responseData);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          message: 'Gemini APIとの通信に失敗しました。',
          api_error: responseData
        })
      };
    }

    // 成功した場合、APIからの応答をそのまま返す
    console.log('Successfully received response from Gemini API.');
    return {
      statusCode: 200,
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '予期せぬエラーが発生しました。', error: error.message })
    };
  }
};
