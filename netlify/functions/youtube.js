const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const { videoId, order } = event.queryStringParameters;

  if (!videoId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'ビデオIDが指定されていません。' }),
    };
  }

  try {
    // --- 動画タイトル取得処理 (ここは変更なし) ---
    const VIDEO_API_URL = 'https://www.googleapis.com/youtube/v3/videos?part=snippet&id=' + videoId + '&key=' + API_KEY;
    const videoResponse = await fetch(VIDEO_API_URL);
    const videoData = await videoResponse.json();
    if (!videoResponse.ok) {
      const errorMessage = videoData.error?.message || '動画情報の取得に失敗しました。';
      return { statusCode: videoResponse.status, body: JSON.stringify({ message: errorMessage }) };
    }
    const videoTitle = videoData.items?.[0]?.snippet?.title || '動画タイトル不明';

    // --- コメント全件取得処理 (ページネーション対応) ---
    let allComments = [];
    let nextPageToken = '';

    do {
      // 2回目以降のリクエストではnextPageTokenを含める
      const pageTokenQuery = nextPageToken ? '&pageToken=' + nextPageToken : '';
      const COMMENTS_API_URL = 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=' + videoId + '&order=' + order + '&maxResults=100' + pageTokenQuery + '&key=' + API_KEY;

      const commentsResponse = await fetch(COMMENTS_API_URL);
      const commentsData = await commentsResponse.json();

      if (!commentsResponse.ok) {
        const errorMessage = commentsData.error?.message || 'コメントの取得に失敗しました。';
        // 既に取得済みのコメントとタイトルを返すこともできるが、今回はエラーとして処理
        throw new Error(errorMessage);
      }

      const mappedComments = commentsData.items.map(item => {
        const comment = item.snippet.topLevelComment.snippet;
        return {
          id: item.snippet.topLevelComment.id,
          author: comment.authorDisplayName,
          authorProfileImageUrl: comment.authorProfileImageUrl,
          publishedAt: new Date(comment.publishedAt).toLocaleString('ja-JP'),
          text: comment.textDisplay,
          likeCount: comment.likeCount,
        };
      });

      allComments = allComments.concat(mappedComments);

      // 次のページがあるか確認
      nextPageToken = commentsData.nextPageToken;

    } while (nextPageToken); // nextPageTokenがある限りループ

    const responseData = {
      videoTitle: videoTitle,
      comments: allComments
    };

    return {
      statusCode: 200,
      body: JSON.stringify(responseData),
    };

  } catch (error) {
    console.error('Server Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'サーバーで予期せぬエラーが発生しました: ' + error.message }),
    };
  }
};
