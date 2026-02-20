<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>送信完了 - アクセシビリティ対応将棋</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* アニメーション */
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes checkmark {
            0% {
                transform: scale(0);
                opacity: 0;
            }
            50% {
                transform: scale(1.2);
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }

        @keyframes pulse {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
            }
            50% {
                box-shadow: 0 0 0 15px rgba(34, 197, 94, 0);
            }
        }

        .fade-in {
            animation: fadeIn 0.6s ease-out;
        }

        .success-icon {
            width: 5rem;
            height: 5rem;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 2rem;
            animation: pulse 2s infinite;
        }

        .success-icon svg {
            animation: checkmark 0.8s ease-out;
        }

        .info-card {
            background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
            transition: transform 0.2s ease;
        }

        .info-card:hover {
            transform: translateY(-2px);
        }

        .btn-primary {
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
            transition: all 0.3s ease;
        }

        .btn-primary:hover {
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }

        .btn-secondary {
            transition: all 0.2s ease;
        }

        .btn-secondary:hover {
            background-color: #F3F4F6;
            transform: translateY(-1px);
        }

        /* キーボードフォーカス */
        a:focus {
            outline: 3px solid #3B82F6;
            outline-offset: 2px;
        }

        /* 前庭障害のあるユーザーへの配慮 */
        @media (prefers-reduced-motion: reduce) {
            .fade-in, .success-icon, .success-icon svg {
                animation: none;
            }
            .info-card:hover, .btn-primary:hover, .btn-secondary:hover {
                transform: none;
            }
        }

        /* ===== ダークモード対応 ===== */
        @media (prefers-color-scheme: dark) {
            body {
                background: linear-gradient(to bottom right, #1a1a2e 0%, #16213e 50%, #0f3460 100%) !important;
                color: #e0e0e0;
            }

            body.bg-gradient-to-br {
                background: linear-gradient(to bottom right, #1a1a2e 0%, #16213e 50%, #0f3460 100%) !important;
            }

            .bg-white {
                background: #2a2a3e !important;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5) !important;
            }

            .text-gray-900 {
                color: #f0f0f0 !important;
            }

            .text-gray-600 {
                color: #a0a0a0 !important;
            }

            .text-gray-700 {
                color: #c0c0c0 !important;
            }

            .info-card {
                background: linear-gradient(135deg, #2a2a3e 0%, #1a1a2e 100%) !important;
                border-color: #444 !important;
            }

            .success-icon {
                background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
            }

            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #5568d3 100%) !important;
            }

            .btn-primary:hover {
                background: linear-gradient(135deg, #5568d3 0%, #4456b8 100%) !important;
            }

            .btn-secondary {
                background: transparent !important;
                border-color: #666 !important;
                color: #a0a0a0 !important;
            }

            .btn-secondary:hover {
                background-color: #2a2a3e !important;
            }

            svg.text-green-600 {
                color: #10b981 !important;
                stroke: #10b981 !important;
            }

            svg.text-blue-600 {
                color: #667eea !important;
                stroke: #667eea !important;
            }
        }

        /* localStorage で明示的にダークモード設定された場合 */
        html.high-contrast body {
            background: #1a1a1a !important;
            color: #f0f0f0 !important;
        }

        html.high-contrast .bg-white {
            background: #2a2a2a !important;
        }

        html.high-contrast .info-card {
            background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%) !important;
            border-color: #555 !important;
        }
    </style>
</head>
<body class="bg-gradient-to-br from-blue-50 via-white to-green-50 min-h-screen">
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-xl w-full">
            <!-- メインカード -->
            <div class="bg-white rounded-2xl shadow-xl p-8 fade-in">
                <!-- 成功アイコン -->
                <div class="success-icon" role="img" aria-label="送信成功">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>

                <!-- タイトル -->
                <h1 class="text-3xl font-bold text-gray-900 mb-3 text-center">
                    送信完了
                </h1>

                <p class="text-gray-600 text-center text-lg mb-6">
                    フィードバックをお送りいただき、<br>
                    ありがとうございました。
                </p>

                <!-- 情報カード -->
                <div class="info-card rounded-xl border border-blue-200 p-5 mb-6">
                    <ul class="space-y-3 text-sm">
                        <li class="flex items-start">
                            <svg class="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span class="text-gray-700">開発者に届きました</span>
                        </li>
                        <li class="flex items-start">
                            <svg class="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                            <span class="text-gray-700">メールアドレスを記入していただいた場合は、必要に応じて連絡します</span>
                        </li>
                    </ul>
                </div>

                <!-- ボタングループ -->
                <div class="space-y-3">
                    <a 
                        href="{{ route('home') }}" 
                        class="btn-primary w-full block text-center px-6 py-4 text-white font-semibold rounded-xl shadow-lg"
                        aria-label="ホームに戻る"
                    >
                        <span class="flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                            </svg>
                            ホームに戻る
                        </span>
                    </a>
                    <a 
                        href="{{ route('feedback.show') }}" 
                        class="btn-secondary w-full block text-center px-6 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl"
                        aria-label="追加のフィードバックを送る"
                    >
                        <span class="flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            追加のフィードバックを送る
                        </span>
                    </a>
                </div>
            </div>

            <!-- フッターメッセージ -->
            <div class="mt-6 text-center fade-in" style="animation-delay: 0.2s; animation-fill-mode: both;">
                <p class="text-gray-600 text-sm">
                    いただいた意見は、アプリの改善に活用します。
                </p>
            </div>
        </div>
    </div>

    <script>
        // ダークモード設定を同期（localStorage/OSテーマに基づく）
        (() => {
            const KEY = 'a11y-shogi-high-contrast';
            const html = document.documentElement;
            
            function applyTheme(isDark) {
                if (isDark) {
                    html.classList.add('high-contrast');
                    document.body.style.colorScheme = 'dark';
                } else {
                    html.classList.remove('high-contrast');
                    document.body.style.colorScheme = 'light';
                }
            }

            function init() {
                const stored = localStorage.getItem(KEY);
                if (stored === '1') {
                    applyTheme(true);
                } else if (stored === '0') {
                    applyTheme(false);
                } else {
                    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    applyTheme(isDark);
                }
            }

            init();

            const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkMediaQuery.addEventListener('change', (e) => {
                const stored = localStorage.getItem(KEY);
                if (stored === null) {
                    applyTheme(e.matches);
                }
            });

            window.addEventListener('storage', (e) => {
                if (e.key === KEY) {
                    if (e.newValue === '1') {
                        applyTheme(true);
                    } else if (e.newValue === '0') {
                        applyTheme(false);
                    } else {
                        init();
                    }
                }
            });
        })();
    </script>
</body>
</html>
