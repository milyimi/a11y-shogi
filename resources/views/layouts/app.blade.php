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
            border: 2px solid var(--color-text);
            background: var(--color-bg);
            color: var(--color-text);
            text-decoration: none;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.2s, color 0.2s;
        }
        
        .btn:hover, .btn:focus {
            background: var(--color-text);
            color: var(--color-bg);
        }
        
        .btn-primary {
            background: var(--color-link);
            color: var(--color-bg);
            border-color: var(--color-link);
        }
        
        .btn-primary:hover, .btn-primary:focus {
            background: #003D7A;
            border-color: #003D7A;
        }

        html.high-contrast .btn-primary {
            background: #4A9AE6;
            color: #000000;
            border-color: #4A9AE6;
        }

        html.high-contrast .btn-primary:hover,
        html.high-contrast .btn-primary:focus {
            background: #6CB4FF;
            border-color: #6CB4FF;
            color: #000000;
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

            // 初期化
            apply(localStorage.getItem(key) === '1');

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
