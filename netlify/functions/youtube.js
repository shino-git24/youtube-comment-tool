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
    const VIDEO_API_URL = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=' + videoId + '&key=' + API_KEY;
    const videoResponse = await fetch(VIDEO_API_URL);
    const videoData = await videoResponse.json();

    if (!videoResponse.ok) {
      const errorMessage = videoData.error?.message || '動画情報の取得に失敗しました。';
      return { statusCode: videoResponse.status, body: JSON.stringify({ message: errorMessage }) };
    }

    const videoItem = videoData.items?.[0];
    const videoTitle = videoItem?.snippet?.title || '動画タイトル不明';

    let allComments = [];
    let fetchedCommentCount = 0; // 返信も含めた総数をカウントする変数
    let nextPageToken = '';

    do {
      const pageTokenQuery = nextPageToken ? '&pageToken=' + nextPageToken : '';
      // ★★★ partに"replies"を追加 ★★★
      const COMMENTS_API_URL = 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=' + videoId + '&order=' + order + '&maxResults=100' + pageTokenQuery + '&key=' + API_KEY;

      const commentsResponse = await fetch(COMMENTS_API_URL);
      const commentsData = await commentsResponse.json();

      if (!commentsResponse.ok) {
        throw new Error(commentsData.error?.message || 'コメントの取得に失敗しました。');
      }

      const mappedComments = commentsData.items.map(item => {
        const topLevelComment = item.snippet.topLevelComment;
        fetchedCommentCount++; // 親コメントをカウント

        // ★★★ 返信コメントの処理を追加 ★★★
        let replies = [];
        if (item.replies) {
          replies = item.replies.comments.map(reply => {
            fetchedCommentCount++; // 返信コメントをカウント
            return {
              id: reply.id,
              author: reply.snippet.authorDisplayName,
              authorProfileImageUrl: reply.snippet.authorProfileImageUrl,
              publishedAt: new Date(reply.snippet.publishedAt).toLocaleString('ja-JP'),
              text: reply.snippet.textOriginal,
              likeCount: reply.snippet.likeCount,
            };
          });
        }

        return {
          id: topLevelComment.id,
          author: topLevelComment.snippet.authorDisplayName,
          authorProfileImageUrl: topLevelComment.snippet.authorProfileImageUrl,
          publishedAt: new Date(topLevelComment.snippet.publishedAt).toLocaleString('ja-JP'),
          text: topLevelComment.snippet.textOriginal,
          likeCount: topLevelComment.snippet.likeCount,
          replies: replies // 返信の配列を持たせる
        };
      });

      allComments = allComments.concat(mappedComments);
      nextPageToken = commentsData.nextPageToken;

    } while (nextPageToken);

    const responseData = {
      videoTitle: videoTitle,
      fetchedCommentCount: fetchedCommentCount,
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
