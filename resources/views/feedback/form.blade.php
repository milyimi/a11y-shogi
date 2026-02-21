<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ご意見・ご感想 - アクセシビリティ対応将棋</title>
    
    <!-- ダークモード設定を即座に適用（フラッシュ防止） -->
    <script>
        (function() {
            const KEY = 'a11y-shogi-high-contrast';
            const html = document.documentElement;
            const stored = localStorage.getItem(KEY);
            
            if (stored === '1') {
                html.classList.add('high-contrast');
                document.documentElement.style.colorScheme = 'dark';
            } else if (stored === '0') {
                html.classList.remove('high-contrast');
                document.documentElement.style.colorScheme = 'light';
            } else {
                // OSの設定に従う
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (isDark) {
                    html.classList.add('high-contrast');
                    document.documentElement.style.colorScheme = 'dark';
                } else {
                    html.classList.remove('high-contrast');
                    document.documentElement.style.colorScheme = 'light';
                }
            }
        })();
    </script>
    
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
            .form-input:focus, .form-textarea:focus {
                transform: none;
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
        
        /* エラーメッセージ表示：色のみに依存しない */
        .form-error {
            display: flex;
            align-items: start;
            gap: 0.5rem;
            color: #DC2626;
            font-weight: 500;
        }
        
        .form-error::before {
            content: "✕";
            flex-shrink: 0;
        }
        
        /* 成功メッセージ */
        .form-success {
            display: flex;
            align-items: start;
            gap: 0.5rem;
            color: #059669;
            font-weight: 500;
        }
        
        .form-success::before {
            content: "✓";
            flex-shrink: 0;
        }
        
        /* 必須フィールドの視覚的表示 */
        .required-indicator {
            color: #DC2626;
            font-weight: bold;
        }
        
        /* フォーム入力フィールド */
        .form-input, .form-textarea {
            width: 100%;
            padding: 0.875rem;
            border: 2px solid #E5E7EB;
            border-radius: 0.75rem;
            font-family: inherit;
            font-size: 1rem;
            transition: all 0.2s;
            background: white;
        }
        
        .form-input:focus, .form-textarea:focus {
            border-color: #4F46E5;
            outline: none;
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }
        
        /* ラジオボタン */
        .radio-group {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        
        .radio-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: white;
            border: 2px solid #E5E7EB;
            border-radius: 0.75rem;
            transition: all 0.2s;
            cursor: pointer;
        }

        .radio-item:hover {
            border-color: #4F46E5;
            background: #F5F3FF;
        }
        
        .radio-item input[type="radio"] {
            width: 1.25rem;
            height: 1.25rem;
            cursor: pointer;
            accent-color: #4F46E5;
        }
        
        .radio-item label {
            cursor: pointer;
            flex-grow: 1;
            font-weight: 500;
        }

        /* チェックボックス */
        .checkbox-group {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            background: white;
            border: 2px solid #E5E7EB;
            border-radius: 0.75rem;
            transition: all 0.2s;
        }

        .checkbox-item:hover {
            border-color: #4F46E5;
            background: #F5F3FF;
        }
        
        .checkbox-item input[type="checkbox"] {
            width: 1.25rem;
            height: 1.25rem;
            cursor: pointer;
            accent-color: #4F46E5;
        }
        
        .checkbox-item label {
            cursor: pointer;
            flex-grow: 1;
        }
        
        /* ボタン */
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
            min-height: 44px;
            min-width: 44px;
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 12px rgba(102, 126, 234, 0.35);
        }
        
        .btn-primary:active {
            transform: translateY(0);
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
        
        /* ヘルプテキスト */
        .help-text {
            font-size: 0.875rem;
            color: #6B7280;
            margin-top: 0.25rem;
        }
        
        /* スキップリンク */
        .skip-link {
            position: absolute;
            top: -40px;
            left: 0;
            background: #4F46E5;
            color: white;
            padding: 8px;
            z-index: 100;
        }
        
        .skip-link:focus {
            top: 0;
        }

        /* カードスタイル */
        .card {
            background: white;
            border-radius: 1rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            padding: 1.25rem;
            margin-bottom: 1rem;
        }

        .fieldset-card {
            background: white;
            border: none;
            border-radius: 1rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            padding: 1.25rem;
            margin-bottom: 1rem;
        }

        /* ===== ダークモード対応（html.high-contrast クラスで制御） ===== */
        html.high-contrast body {
            background: linear-gradient(to bottom right, #1a1a2e 0%, #16213e 50%, #0f3460 100%) !important;
            color: #e0e0e0;
        }

        html.high-contrast body.bg-gradient-to-br {
            background: linear-gradient(to bottom right, #1a1a2e 0%, #16213e 50%, #0f3460 100%) !important;
        }

        html.high-contrast .text-gray-900 {
            color: #f0f0f0 !important;
        }

        html.high-contrast .text-gray-600 {
            color: #a0a0a0 !important;
        }

        html.high-contrast .card,
        html.high-contrast .fieldset-card {
            background: #2a2a3e !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            border-color: #444 !important;
        }

        html.high-contrast .form-input,
        html.high-contrast .form-textarea {
            background: #1a1a2e !important;
            color: #e0e0e0 !important;
            border-color: #444 !important;
        }

        html.high-contrast .form-input:focus,
        html.high-contrast .form-textarea:focus {
            border-color: #667eea !important;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2) !important;
        }

        html.high-contrast .radio-item {
            background: #2a2a3e !important;
            border-color: #444 !important;
            color: #e0e0e0 !important;
        }

        html.high-contrast .radio-item:hover {
            border-color: #667eea !important;
            background: #333355 !important;
        }

        html.high-contrast .radio-item label {
            color: #e0e0e0 !important;
        }

        html.high-contrast .checkbox-item {
            background: #2a2a3e !important;
            border-color: #444 !important;
            color: #e0e0e0 !important;
        }

        html.high-contrast .checkbox-item:hover {
            border-color: #667eea !important;
            background: #333355 !important;
        }

        html.high-contrast .checkbox-item label {
            color: #e0e0e0 !important;
        }

        html.high-contrast .btn-secondary {
            background: #2a2a3e !important;
            color: #a0a0a0 !important;
            border-color: #444 !important;
        }

        html.high-contrast .btn-secondary:hover {
            border-color: #667eea !important;
            color: #667eea !important;
            background: #333355 !important;
        }

        html.high-contrast .help-text {
            color: #a0a0a0 !important;
        }

        html.high-contrast .form-error {
            color: #ff6666 !important;
        }

        html.high-contrast .form-success {
            color: #66dd66 !important;
            background: rgba(102, 221, 102, 0.1) !important;
            border-color: #66dd66 !important;
        }

        html.high-contrast .skip-link {
            background: #667eea !important;
            color: white !important;
        }

        html.high-contrast .bg-green-50 {
            background: rgba(102, 221, 102, 0.1) !important;
            border-color: #66dd66 !important;
        }

        /* SVGアイコンの色調整 */
        html.high-contrast svg.text-indigo-600 {
            color: #667eea !important;
            stroke: #667eea !important;
        }

        html.high-contrast svg.text-gray-900 {
            color: #e0e0e0 !important;
            stroke: #e0e0e0 !important;
        }

        html.high-contrast svg.text-white {
            color: white !important;
            stroke: white !important;
        }

        html.high-contrast .text-indigo-600 {
            color: #667eea !important;
        }

        html.high-contrast .text-gray-500 {
            color: #a0a0a0 !important;
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
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                    </svg>
                </div>
                <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">ご意見・ご感想</h1>
                <p class="text-gray-600">ご意見が今後の開発改善に役立ちます。</p>
            </div>

            <!-- サクセスメッセージ -->
            @if (session('success'))
                <div class="mb-6 p-4 form-success border-l-4 border-green-600 bg-green-50 rounded-xl slide-in">
                    {{ session('success') }}
                </div>
            @endif

            <!-- フォーム -->
            <form method="POST" action="{{ route('feedback.confirm') }}" novalidate id="feedback-form">
                @csrf
                <main id="main-content">
                    <!-- フィードバックタイプ -->
                    <fieldset class="fieldset-card slide-in" style="animation-delay: 0.1s;">
                        <legend class="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                            </svg>
                            フィードバック種別 <span class="required-indicator">*</span>
                        </legend>
                        <div class="radio-group">
                            <div class="radio-item">
                                <input 
                                    type="radio" 
                                    id="type-general" 
                                    name="type" 
                                    value="general"
                                    {{ (old('type') ?: ($feedback_data['type'] ?? '')) === 'general' ? 'checked' : '' }}
                                    required
                                    aria-describedby="type-help"
                                >
                                <label for="type-general">一般的なご意見・ご感想</label>
                            </div>
                            <div class="radio-item">
                                <input 
                                    type="radio" 
                                    id="type-bug" 
                                    name="type" 
                                    value="bug"
                                    {{ (old('type') ?: ($feedback_data['type'] ?? '')) === 'bug' ? 'checked' : '' }}
                                >
                                <label for="type-bug">不具合報告</label>
                            </div>
                            <div class="radio-item">
                                <input 
                                    type="radio" 
                                    id="type-feature" 
                                    name="type" 
                                    value="feature_request"
                                    {{ (old('type') ?: ($feedback_data['type'] ?? '')) === 'feature_request' ? 'checked' : '' }}
                                >
                                <label for="type-feature">機能リクエスト</label>
                            </div>
                        </div>
                        @error('type')
                            <div class="form-error mt-2" role="alert">{{ $message }}</div>
                        @enderror
                        <p class="help-text mt-3" id="type-help">いずれか1つをお選びください。GitHub Copilot等のAIツールを使うほど、より多くのテストケースが生まれ、予期しない不具合が発見されることもあります。</p>
                    </fieldset>

                    <!-- 名前 -->
                    <div class="card slide-in" style="animation-delay: 0.2s;">
                        <label for="name" class="block font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                            お名前 <span class="text-gray-500 text-sm font-normal">(オプション）</span>
                        </label>
                        <input 
                            type="text" 
                            id="name" 
                            name="name" 
                            maxlength="100"
                            class="form-input"
                            value="{{ old('name') ?: ($feedback_data['name'] ?? '') }}"
                            aria-describedby="name-help"
                            placeholder="田中太郎"
                        >
                        <p class="help-text mt-2" id="name-help">本名である必要はありません</p>
                        @error('name')
                            <div class="form-error mt-2" role="alert">{{ $message }}</div>
                        @enderror
                    </div>

                    <!-- メールアドレス -->
                    <div class="card slide-in" style="animation-delay: 0.3s;">
                        <label for="email" class="block font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                            メールアドレス <span class="text-gray-500 text-sm font-normal">(オプション）</span>
                        </label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            maxlength="255"
                            class="form-input"
                            value="{{ old('email') ?: ($feedback_data['email'] ?? '') }}"
                            aria-describedby="email-help"
                            placeholder="your-email@example.com"
                        >
                        <p class="help-text mt-2" id="email-help">フォローアップが必要な場合のご連絡用です</p>
                        @error('email')
                            <div class="form-error mt-2" role="alert">{{ $message }}</div>
                        @enderror
                    </div>

                    <!-- 障害・特性（自己申告） -->
                    <fieldset class="fieldset-card slide-in" style="animation-delay: 0.4s;">
                        <legend class="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                            ご自身の特性（任意）
                        </legend>
                        <div class="checkbox-group">
                            <div class="checkbox-item">
                                <input 
                                    type="checkbox" 
                                    id="disability-blind" 
                                    name="disability[]" 
                                    value="全盲（スクリーンリーダー利用）"
                                >
                                <label for="disability-blind">全盲（スクリーンリーダー利用）</label>
                            </div>
                            <div class="checkbox-item">
                                <input 
                                    type="checkbox" 
                                    id="disability-lowvision" 
                                    name="disability[]" 
                                    value="弱視（拡大表示等を使用）"
                                >
                                <label for="disability-lowvision">弱視（拡大表示等を使用）</label>
                            </div>
                            <div class="checkbox-item">
                                <input 
                                    type="checkbox" 
                                    id="disability-colorblind" 
                                    name="disability[]" 
                                    value="色覚異常（色弱）"
                                >
                                <label for="disability-colorblind">色覚異常（色弱）</label>
                            </div>
                            <div class="checkbox-item">
                                <input 
                                    type="checkbox" 
                                    id="disability-motor" 
                                    name="disability[]" 
                                    value="運動機能障害（キーボード操作のみ等）"
                                >
                                <label for="disability-motor">運動機能障害（キーボード操作のみ等）</label>
                            </div>
                            <div class="checkbox-item">
                                <input 
                                    type="checkbox" 
                                    id="disability-adhd" 
                                    name="disability[]" 
                                    value="ADHD（集中困難等）"
                                >
                                <label for="disability-adhd">ADHD（集中困難等）</label>
                            </div>
                            <div class="checkbox-item">
                                <input 
                                    type="checkbox" 
                                    id="disability-dyslexia" 
                                    name="disability[]" 
                                    value="読字障害（ディスレクシア）"
                                >
                                <label for="disability-dyslexia">読字障害（ディスレクシア）</label>
                            </div>
                            <div class="checkbox-item">
                                <input 
                                    type="checkbox" 
                                    id="disability-other" 
                                    name="disability[]" 
                                    value="その他"
                                >
                                <label for="disability-other">その他の特性がある</label>
                            </div>
                            <div class="checkbox-item">
                                <input 
                                    type="checkbox" 
                                    id="disability-none" 
                                    name="disability[]" 
                                    value="特性なし"
                                >
                                <label for="disability-none">特に当てはまるものはない</label>
                            </div>
                        </div>
                        <p class="help-text mt-3">複数選択可能です。個人情報はサーバーに保存されません。</p>
                    </fieldset>

                    <!-- フィードバック内容 -->
                    <div class="card slide-in" style="animation-delay: 0.5s;">
                        <label for="message" class="block font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                            ご意見・ご感想 <span class="required-indicator">*</span>
                        </label>
                        <textarea 
                            id="message" 
                            name="message" 
                            rows="6" 
                            maxlength="2000"
                            class="form-textarea"
                            required
                            aria-describedby="message-help"
                            placeholder="自由に記入してください。例）このボタンが見つけやすくなると良い、バグで動作しない箇所がある、こういう機能が欲しいなど"
                        >{{ old('message') ?: ($feedback_data['message'] ?? '') }}</textarea>
                        <div class="flex justify-between items-center mt-3">
                            <p class="help-text" id="message-help">最低10文字、最大2000文字</p>
                            <p class="text-sm font-semibold text-indigo-600" aria-live="polite">
                                <span id="char-count">0</span> / 2000
                            </p>
                        </div>
                        @error('message')
                            <div class="form-error mt-2" role="alert">{{ $message }}</div>
                        @enderror
                    </div>

                    <!-- ボタン -->
                    <div class="flex flex-col sm:flex-row gap-4 slide-in" style="animation-delay: 0.6s;">
                        <a 
                            href="{{ route('home') }}" 
                            class="btn-secondary flex-1 text-center"
                            aria-label="キャンセル、ホームに戻る"
                        >
                            <span class="flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                                </svg>
                                キャンセル
                            </span>
                        </a>
                        <button 
                            type="submit" 
                            class="btn-primary flex-1"
                            aria-label="確認画面へ進む"
                        >
                            <span class="flex items-center justify-center gap-2">
                                確認画面へ
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                                </svg>
                            </span>
                        </button>
                    </div>
                </main>
            </form>

            <!-- フッター説明 -->
            <div class="text-center mt-6 fade-in text-sm text-gray-600" style="animation-delay: 0.7s;">
                <p>💡 サーバーにデータは保存せず、開発者あてにメール送信されます</p>
            </div>
        </div>
    </div>

    <script>
        // キーボード操作検出
        let hasUsedKeyboard = false;
        document.addEventListener('keydown', (e) => {
            if (!hasUsedKeyboard) {
                document.body.classList.add('keyboard-mode');
                hasUsedKeyboard = true;
            }
        });

        // 文字数カウント
        const textarea = document.getElementById('message');
        const charCount = document.getElementById('char-count');
        if (textarea) {
            textarea.addEventListener('input', () => {
                charCount.textContent = textarea.value.length;
            });
            // 初期値
            charCount.textContent = textarea.value.length;
        }

        // ダークモード設定のリアルタイム同期（初期化は<head>で実行済み）
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

            // OSのテーマ変更を検知
            const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkMediaQuery.addEventListener('change', (e) => {
                const stored = localStorage.getItem(KEY);
                if (stored === null) {
                    applyTheme(e.matches);
                }
            });

            // localStorage の変更を検知（別タブからの変更など）
            window.addEventListener('storage', (e) => {
                if (e.key === KEY) {
                    if (e.newValue === '1') {
                        applyTheme(true);
                    } else if (e.newValue === '0') {
                        applyTheme(false);
                    } else {
                        // 削除された場合はOS設定に従う
                        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        applyTheme(isDark);
                    }
                }
            });
        })();

        // フォーム検証
        document.getElementById('feedback-form').addEventListener('submit', function(e) {
            const message = document.getElementById('message').value;
            if (message.length < 10) {
                e.preventDefault();
                alert('ご意見が短すぎます。もう少し詳しくお聞かせください。');
            }
        });
    </script>
</body>
</html>
