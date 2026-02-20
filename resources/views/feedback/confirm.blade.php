<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>フィードバック確認画面 - アクセシビリティ対応将棋</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* アニメーション定義 */
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .fade-in {
            animation: fadeIn 0.6s ease-out;
        }

        .slide-in {
            animation: slideIn 0.5s ease-out;
        }

        /* 前庭障害のあるユーザーへの配慮 */
        @media (prefers-reduced-motion: reduce) {
            .fade-in, .slide-in {
                animation: none;
            }
            .btn-primary:hover, .btn-primary:active {
                transform: none;
            }
        }

        /* キーボード操作時のフォーカスリング強調 */
        body.keyboard-mode *:focus {
            outline: 3px solid #4F46E5 !important;
            outline-offset: 2px !important;
        }

        /* スキップリンク: キーボード操作時に表示 */
        .skip-link {
            position: absolute;
            left: -9999px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        }

        .skip-link:focus {
            left: 0;
            top: 0;
            width: auto;
            height: auto;
            padding: 0.5rem;
            background: #4F46E5;
            color: white;
            z-index: 1000;
        }

        /* フォーカス状態のボタンスタイル */
        button:focus {
            outline: 3px solid #4F46E5 !important;
            outline-offset: 2px !important;
        }

        /* フィードバック内容の表示 */
        .feedback-display {
            background: white;
            border-radius: 1rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            padding: 1.25rem;
        }

        .feedback-item {
            margin-bottom: 1.25rem;
            padding-bottom: 1.25rem;
            border-bottom: 2px solid #F3F4F6;
        }

        .feedback-item:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }

        .feedback-label {
            font-weight: 700;
            color: #4B5563;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .feedback-value {
            color: #1F2937;
            line-height: 1.6;
            white-space: pre-wrap;
            word-break: break-word;
            font-size: 1rem;
            padding: 0.75rem;
            background: #F9FAFB;
            border-radius: 0.5rem;
            border-left: 3px solid #667eea;
        }

        /* ボタンスタイル */
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            border-radius: 0.75rem;
            font-size: 1.125rem;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 12px rgba(102, 126, 234, 0.35);
        }

        .btn-secondary {
            background: white;
            color: #6B7280;
            padding: 0.875rem 1.75rem;
            border-radius: 0.75rem;
            font-size: 1rem;
            font-weight: 600;
            border: 2px solid #E5E7EB;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-secondary:hover {
            border-color: #4F46E5;
            color: #4F46E5;
            background: #F5F3FF;
        }
    </style>
</head>
<body class="bg-gradient-to-br from-indigo-50 via-white to-purple-50 min-h-screen">
    <!-- スキップリンク -->
    <a href="#main-content" class="skip-link">メインコンテンツへスキップ</a>

    <div class="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
        <div class="max-w-3xl mx-auto">
            <!-- ヘッダー -->
            <div class="text-center mb-6 fade-in">
                <div class="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mb-3 shadow-lg" aria-hidden="true">
                    <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">フィードバック確認</h1>
                <p class="text-gray-600">以下の内容でよろしければ「送信」ボタンをクリックしてください。</p>
            </div>

    <!-- メインコンテンツ -->
    <main id="main-content">
        <!-- フィードバック内容表示 -->
        <section class="feedback-display mb-6 slide-in" style="animation-delay: 0.1s;">
            <div class="feedback-item">
                <label class="feedback-label">
                    <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                    </svg>
                    フィードバック種別
                </label>
                <div class="feedback-value">
                    @if($data['type'] === 'general')
                        ご意見・ご感想
                    @elseif($data['type'] === 'bug')
                        不具合報告
                    @elseif($data['type'] === 'feature_request')
                        機能リクエスト
                    @else
                        {{ $data['type'] }}
                    @endif
                </div>
            </div>

            @if($data['name'] ?? null)
                <div class="feedback-item">
                    <label class="feedback-label">
                        <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        お名前
                    </label>
                    <div class="feedback-value">{{ $data['name'] }}</div>
                </div>
            @endif

            @if($data['email'] ?? null)
                <div class="feedback-item">
                    <label class="feedback-label">
                        <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        メールアドレス
                    </label>
                    <div class="feedback-value">{{ $data['email'] }}</div>
                </div>
            @endif

            @if($data['disability'] ?? null)
                <div class="feedback-item">
                    <label class="feedback-label">
                        <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        ご自身の特性
                    </label>
                    <div class="feedback-value">{{ $data['disability'] }}</div>
                </div>
            @endif

            <div class="feedback-item">
                <label class="feedback-label">
                    <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    ご意見・ご感想
                </label>
                <div class="feedback-value">{{ $data['message'] }}</div>
            </div>
        </section>

        <!-- データの扱い -->
        <section class="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-xl p-4 mb-6 slide-in" style="animation-delay: 0.2s;">
            <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                    <p class="font-bold text-gray-900 text-sm mb-1">送信について</p>
                    <p class="text-xs text-gray-700">
                        開発者あてに直接メール送信されます。サーバーにデータは保存されません。
                    </p>
                </div>
            </div>
        </section>

        <!-- ボタングループ -->
        <section class="flex flex-col sm:flex-row gap-3 mb-6 slide-in" style="animation-delay: 0.3s;">
            <!-- 送信ボタン -->
            <form method="POST" action="{{ route('feedback.store') }}" class="flex-1">
                @csrf
                <button 
                    type="submit"
                    class="btn-primary w-full"
                    aria-label="フィードバックを送信する"
                >
                    <span class="flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                        送信
                    </span>
                </button>
            </form>

            <!-- キャンセルボタン（修正に戻る）-->
            <a 
                href="{{ route('feedback.show') }}"
                class="btn-secondary flex-1 text-center"
                aria-label="フィードバック入力フォームに戻る"
            >
                <span class="flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    修正
                </span>
            </a>
        </section>

        <!-- ホームへのリンク -->
        <nav class="flex justify-center mt-4 fade-in" style="animation-delay: 0.4s;">
            <a 
                href="{{ route('home') }}"
                class="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-2 transition-all text-sm"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                ホームに戻る
            </a>
        </nav>
    </main>
        </div>
    </div>

    <!-- フッター -->
    <footer class="bg-gray-100 text-gray-600 text-center py-4 mt-12">
        <p class="text-sm">© 2026 アクセシビリティ対応将棋. All rights reserved.</p>
    </footer>

    <script>
        // キーボード操作の検出
        document.addEventListener('keydown', () => {
            document.body.classList.add('keyboard-mode');
        });
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-mode');
        });
    </script>
</body>
</html>
