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
            --color-link: #0066CC;
            --color-link-visited: #551A8B;
            --color-focus: #FFD700;
            --color-border: #CCCCCC;
            --color-error: #CC0000;
            --color-success: #008800;
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
            background: #F5F5F5;
            border-bottom: 2px solid var(--color-border);
            padding: 16px 0;
            margin-bottom: 24px;
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
        
        .main-content {
            min-height: 60vh;
        }
        
        .footer {
            background: #F5F5F5;
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
            background: #004C99;
            border-color: #004C99;
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
    
    @stack('scripts')
</body>
</html>
