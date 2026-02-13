<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'アクセシブル将棋 - A11y Shogi')</title>
    
    {{-- Tailwind CSS --}}
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    
    {{-- Custom Styles --}}
    <style>
        :root {
            --color-text: #1A1A1A;
            --color-bg: #FFFFFF;
            --color-text-secondary: #545454;
            --color-link: #0055AA;
            --color-link-visited: #551A8B;
            --color-focus: #FFD700;
            --color-border: #999999;
            --color-error: #CC0000;
            --color-success: #008800;
            --color-surface: #F5F5F5;
            --color-table-border: #BBBBBB;
            /* ボタン配色（将棋盤の木目調） */
            --color-btn-bg: #F0E6D6;
            --color-btn-bg-end: #E8DCC8;
            --color-btn-hover-bg: #E0D0B8;
            --color-btn-hover-bg-end: #D4C4A8;
            --color-btn-text: #3C2F1E;
            --color-btn-border: #C4A882;
            --color-btn-shadow: rgba(150, 120, 80, 0.2);
            --color-btn-danger-bg: #C62828;
            --color-btn-danger-hover: #A51D1D;
            --color-btn-danger-border: #B71C1C;
        }

        html.high-contrast {
            --color-text: #F0F0F0;
            --color-bg: #1A1A1A;
            --color-text-secondary: #CCCCCC;
            --color-link: #6CB4FF;
            --color-link-visited: #C8A2FF;
            --color-focus: #FF8C00;
            --color-border: #888888;
            --color-error: #FF6666;
            --color-success: #66DD66;
            --color-surface: #2A2A2A;
            --color-table-border: #666666;
            /* ボタン配色（HC） */
            --color-btn-bg: #2E2820;
            --color-btn-bg-end: #262018;
            --color-btn-hover-bg: #3D3520;
            --color-btn-hover-bg-end: #4A4028;
            --color-btn-text: #F0E0C8;
            --color-btn-border: #D4A843;
            --color-btn-shadow: rgba(212, 168, 67, 0.25);
            --color-btn-danger-bg: #C62828;
            --color-btn-danger-hover: #E53935;
            --color-btn-danger-border: #EF5350;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: var(--color-text);
            background-color: var(--color-bg);
            margin: 0;
            padding: 0;
        }
        
        a {
            color: var(--color-link);
            text-decoration: underline;
        }
        
        a:visited {
            color: var(--color-link-visited);
        }
        
        a:hover, a:focus {
            text-decoration: underline;
            outline: 3px solid var(--color-focus);
            outline-offset: 2px;
        }
        
        button, input, select, textarea {
            font-family: inherit;
            font-size: 100%;
        }
        
        button:focus, input:focus, select:focus, textarea:focus {
            outline: 3px solid var(--color-focus);
            outline-offset: 2px;
        }
        
        .skip-link {
            position: absolute;
            top: -40px;
            left: 0;
            background: var(--color-text);
            color: var(--color-bg);
            padding: 8px 16px;
            z-index: 100;
            text-decoration: none;
        }
        
        .skip-link:focus {
            top: 0;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 16px;
        }
        
        .header {
            background: var(--color-surface);
            border-bottom: 2px solid var(--color-border);
            padding: 16px 0;
            margin-bottom: 24px;
        }
        
        .header .container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
        }

        .header-left {
            display: flex;
            flex-direction: column;
        }
        
        .header h1 {
            margin: 0;
            font-size: 1.75rem;
            font-weight: bold;
        }
        
        .nav-links {
            display: flex;
            gap: 24px;
            margin-top: 12px;
            padding: 0;
            list-style: none;
        }
        
        .nav-links a {
            font-weight: 500;
        }

        .contrast-toggle {
            padding: 8px 16px;
            min-height: 44px;
            min-width: 44px;
            border: 2px solid var(--color-text);
            background: var(--color-bg);
            color: var(--color-text);
            font-weight: bold;
            font-size: 0.9rem;
            cursor: pointer;
            border-radius: 4px;
            white-space: nowrap;
        }

        .contrast-toggle:hover,
        .contrast-toggle:focus {
            background: var(--color-text);
            color: var(--color-bg);
        }

        html.high-contrast .contrast-toggle {
            border-width: 3px;
        }
        
        .main-content {
            min-height: 60vh;
        }
        
        .footer {
            background: var(--color-surface);
            border-top: 2px solid var(--color-border);
            padding: 24px 0;
            margin-top: 48px;
            text-align: center;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 24px;
            min-height: 44px;
            min-width: 44px;
            border: 2px solid var(--color-btn-border);
            border-radius: 8px;
            background: linear-gradient(to bottom, var(--color-btn-bg), var(--color-btn-bg-end)) !important;
            color: var(--color-btn-text) !important;
            text-decoration: none;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.2s, color 0.2s, box-shadow 0.2s, transform 0.12s, border-color 0.2s;
            box-shadow: 0 2px 6px var(--color-btn-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.4);
            text-align: center;
            letter-spacing: 0.02em;
        }
        
        .btn:hover, .btn:focus {
            background: linear-gradient(to bottom, var(--color-btn-hover-bg), var(--color-btn-hover-bg-end)) !important;
            color: var(--color-btn-text) !important;
            border-color: var(--color-btn-text);
            box-shadow: 0 4px 10px var(--color-btn-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
            outline: 3px solid var(--color-focus);
            outline-offset: 2px;
        }
        
        .btn:active {
            transform: translateY(0);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
            background: var(--color-btn-hover-bg-end) !important;
        }

        .btn:disabled {
            opacity: 0.45;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
            filter: grayscale(0.4);
            border-style: dotted;
        }

        .btn-secondary {
            background: linear-gradient(to bottom, rgba(240, 230, 214, 0.3), rgba(232, 220, 200, 0.3)) !important;
            border-style: dashed;
            border-color: var(--color-btn-border);
            box-shadow: 0 1px 3px var(--color-btn-shadow);
        }

        .btn-secondary:hover, .btn-secondary:focus {
            background: var(--color-btn-bg) !important;
            color: var(--color-btn-text) !important;
            border-style: solid;
            border-color: var(--color-btn-text);
            box-shadow: 0 2px 6px var(--color-btn-shadow);
            outline: 3px solid var(--color-focus);
            outline-offset: 2px;
        }

        .btn-danger {
            background: linear-gradient(to bottom, #D32F2F, var(--color-btn-danger-bg)) !important;
            color: #FFFFFF !important;
            border-color: var(--color-btn-danger-border);
            box-shadow: 0 2px 6px rgba(198, 40, 40, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .btn-danger:hover, .btn-danger:focus {
            background: linear-gradient(to bottom, var(--color-btn-danger-bg), var(--color-btn-danger-hover)) !important;
            color: #FFFFFF !important;
            border-color: var(--color-btn-danger-hover);
            box-shadow: 0 4px 10px rgba(198, 40, 40, 0.4);
            outline: 3px solid var(--color-focus);
            outline-offset: 2px;
        }

        .btn-danger:active {
            background: var(--color-btn-danger-hover) !important;
        }
        
        .btn-primary {
            background: linear-gradient(to bottom, #1A6FC4, var(--color-link)) !important;
            color: #FFFFFF !important;
            border-color: var(--color-link);
            box-shadow: 0 2px 6px rgba(0, 78, 152, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        
        .btn-primary:hover, .btn-primary:focus {
            background: linear-gradient(to bottom, var(--color-link), #003D7A) !important;
            border-color: #003D7A;
            color: #FFFFFF !important;
            box-shadow: 0 4px 10px rgba(0, 61, 122, 0.35);
            outline: 3px solid var(--color-focus);
            outline-offset: 2px;
        }

        .btn-primary:active {
            background: #003D7A !important;
        }

        html.high-contrast .btn-primary {
            background: linear-gradient(to bottom, #2563EB, #1B5299) !important;
            color: #FFFFFF !important;
            border-color: #6CB4FF !important;
            box-shadow: 0 2px 6px rgba(27, 82, 153, 0.4);
        }

        html.high-contrast .btn-primary:hover,
        html.high-contrast .btn-primary:focus {
            background: linear-gradient(to bottom, #3B82F6, #2563EB) !important;
            border-color: #93C5FD !important;
            color: #FFFFFF !important;
            outline: 3px solid var(--color-focus);
            outline-offset: 2px;
        }

        html.high-contrast .btn-secondary {
            border-color: #AA8855;
        }

        kbd {
            display: inline-block;
            padding: 2px 7px;
            font-family: inherit;
            font-size: 0.9em;
            line-height: 1.4;
            color: var(--color-btn-text, #3C2F1E);
            background: var(--color-btn-bg, #F0E6D6);
            border: 1px solid var(--color-btn-border, #C4A882);
            border-radius: 4px;
            box-shadow: 0 1px 1px rgba(0, 0, 0, 0.15);
            white-space: nowrap;
        }

        html.high-contrast kbd {
            color: #F0E0C8;
            background: #3A3028;
            border-color: #D4A843;
        }
        
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
        }
        
        .alert {
            padding: 16px;
            margin-bottom: 24px;
            border-left: 4px solid;
        }
        
        .alert-error {
            background: #FFE6E6;
            border-color: var(--color-error);
            color: var(--color-error);
        }
        
        .alert-success {
            background: #E6FFE6;
            border-color: var(--color-success);
            color: var(--color-success);
        }

        html.high-contrast .alert-error {
            background: #3A1A1A;
        }

        html.high-contrast .alert-success {
            background: #1A3A1A;
        }
        
        /* Windows高コントラストモード (forced-colors) 対応 */
        @media (forced-colors: active) {
            .btn,
            .btn-primary,
            .btn-secondary,
            .btn-danger {
                forced-color-adjust: none;
                background: ButtonFace !important;
                color: ButtonText !important;
                border: 2px solid ButtonText !important;
                box-shadow: none !important;
                outline: none;
                transform: none !important;
            }
            .btn:hover, .btn:focus,
            .btn-secondary:hover, .btn-secondary:focus,
            .btn-danger:hover, .btn-danger:focus {
                background: Highlight !important;
                color: HighlightText !important;
                border-color: HighlightText !important;
                outline: 3px solid Highlight !important;
                outline-offset: 3px;
            }
            .btn-primary {
                forced-color-adjust: none;
                background: Highlight !important;
                color: HighlightText !important;
                border: 3px solid HighlightText !important;
            }
            .btn-primary:hover, .btn-primary:focus {
                background: HighlightText !important;
                color: Highlight !important;
                border-color: Highlight !important;
                outline: 3px solid Highlight !important;
                outline-offset: 3px;
            }
            .btn:active,
            .btn-primary:active,
            .btn-danger:active {
                background: Highlight !important;
                color: HighlightText !important;
            }
            .btn:disabled {
                opacity: 0.5;
                border-style: dotted;
            }
            .btn-secondary {
                border-style: dashed !important;
            }
            .btn-danger {
                border: 3px solid ButtonText !important;
            }
            a {
                color: LinkText;
            }
            a:visited {
                color: VisitedText;
            }
            a:hover, a:focus {
                outline: 3px solid Highlight;
                outline-offset: 2px;
            }
            .contrast-toggle {
                forced-color-adjust: none;
                background: ButtonFace !important;
                color: ButtonText !important;
                border: 2px solid ButtonText;
            }
            .contrast-toggle:hover,
            .contrast-toggle:focus {
                background: Highlight !important;
                color: HighlightText !important;
                outline: 3px solid HighlightText;
                outline-offset: 2px;
            }
            .header {
                border-bottom-color: CanvasText;
            }
            .footer {
                border-top-color: CanvasText;
            }
            .skip-link:focus {
                background: Highlight;
                color: HighlightText;
            }
            kbd {
                forced-color-adjust: auto;
                box-shadow: none;
            }
        }

        @media (max-width: 767px) {
            body {
                font-size: 14px;
            }
            
            .header h1 {
                font-size: 1.5rem;
            }
            
            .nav-links {
                flex-direction: column;
                gap: 8px;
            }
        }
    </style>
    
    @stack('styles')
</head>
<body>
    {{-- Skip Links --}}
    <a href="#main-content" class="skip-link">メインコンテンツへスキップ</a>
    <a href="#navigation" class="skip-link">ナビゲーションへスキップ</a>
    
    {{-- Header --}}
    <header class="header" role="banner">
        <div class="container">
            <div class="header-left">
                <h1>
                    <a href="{{ route('home') }}" style="text-decoration: none; color: inherit;">
                        アクセシブル将棋
                    </a>
                </h1>
                <nav id="navigation" aria-label="メインナビゲーション">
                    <ul class="nav-links">
                        <li><a href="{{ route('home') }}">ホーム</a></li>
                        <li><a href="{{ route('ranking.index') }}">ランキング</a></li>
                        <li><a href="{{ route('help') }}">ヘルプ</a></li>
                    </ul>
                </nav>
            </div>
            <button type="button" class="contrast-toggle" id="contrast-toggle"
                    aria-pressed="false" aria-label="ダークモード切替">
                ダークモード: OFF
            </button>
        </div>
    </header>
    
    {{-- ARIA Live Region for Screen Reader Announcements --}}
    <div aria-live="polite" aria-atomic="true" class="sr-only" id="sr-announcements"></div>
    
    {{-- Main Content --}}
    <main id="main-content" class="main-content" role="main">
        <div class="container">
            @yield('content')
        </div>
    </main>
    
    {{-- Footer --}}
    <footer class="footer" role="contentinfo">
        <div class="container">
            <p>&copy; 2026 アクセシブル将棋 (A11y Shogi)</p>
            <p>
                <small>
                    WCAG 2.1 AAA準拠を目指したアクセシブルな将棋ゲーム<br>
                    キーボードのみで操作可能です
                </small>
            </p>
        </div>
    </footer>
    
    <script>
        (function() {
            var btn = document.getElementById('contrast-toggle');
            var html = document.documentElement;
            var key = 'a11y-shogi-high-contrast';

            function apply(on) {
                if (on) {
                    html.classList.add('high-contrast');
                    btn.textContent = 'ダークモード: ON';
                    btn.setAttribute('aria-pressed', 'true');
                } else {
                    html.classList.remove('high-contrast');
                    btn.textContent = 'ダークモード: OFF';
                    btn.setAttribute('aria-pressed', 'false');
                }
            }

            // OS のダークテーマ検出
            var darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

            function getInitialState() {
                var stored = localStorage.getItem(key);
                // ユーザーが明示的に設定済み → その設定を優先
                if (stored === '1') return true;
                if (stored === '0') return false;
                // 未設定 → OS のダークテーマに従う
                return darkMediaQuery.matches;
            }

            // 初期化
            apply(getInitialState());

            // OS テーマ変更を検知して自動切替（ユーザーが手動設定していない場合）
            darkMediaQuery.addEventListener('change', function(e) {
                var stored = localStorage.getItem(key);
                // ユーザーが手動で設定していない場合のみ OS テーマに追従
                if (stored === null) {
                    apply(e.matches);
                    // スクリーンリーダーへ通知
                    var sr = document.getElementById('sr-announcements');
                    if (sr) {
                        sr.textContent = e.matches
                            ? 'OSのダークテーマを検出し、ダークモードに切り替えました'
                            : 'OSのライトテーマを検出し、通常モードに切り替えました';
                    }
                }
            });

            btn.addEventListener('click', function() {
                var on = !html.classList.contains('high-contrast');
                localStorage.setItem(key, on ? '1' : '0');
                apply(on);
                // スクリーンリーダーへ通知
                var sr = document.getElementById('sr-announcements');
                if (sr) {
                    sr.textContent = on ? 'ダークモードをオンにしました' : 'ダークモードをオフにしました';
                }
            });
        })();
    </script>

    @stack('scripts')
</body>
</html>
