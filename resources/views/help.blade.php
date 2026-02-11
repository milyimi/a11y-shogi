@extends('layouts.app')

@section('title', 'ヘルプ - アクセシブル将棋')

@section('content')
<div class="help-page">
    <h2>ヘルプ・操作方法</h2>
    
    <section aria-labelledby="basic-operation-heading">
        <h3 id="basic-operation-heading">基本操作</h3>
        <p>このサイトは完全にキーボードのみで操作できます。</p>
        
        <h4>盤面の操作</h4>
        <dl style="line-height: 2; margin-top: 16px;">
            <dt style="font-weight: bold;">矢印キー (←↑↓→)</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                盤面上のマス目を移動します
            </dd>
            
            <dt style="font-weight: bold;">Enter / Space</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                駒を選択します。もう一度押すと移動先を決定します
            </dd>
            
            <dt style="font-weight: bold;">Escape</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                駒の選択をキャンセルします
            </dd>
            
            <dt style="font-weight: bold;">Tab / Shift+Tab</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                ボタンなど盤面以外の要素に移動します
            </dd>
        </dl>
        
        <h4 style="margin-top: 32px;">持ち駒を打つ方法</h4>
        <p style="margin-top: 8px; line-height: 1.8;">
            取った駒は駒台に並びます。持ち駒を盤面に打つには、次の3ステップで操作します。
        </p>
        <ol style="margin-top: 12px; line-height: 2; padding-left: 24px;">
            <li><strong>Shift+T</strong>（先手の駒台）または <strong>Shift+G</strong>（後手の駒台）を押して、駒台へ移動します</li>
            <li><strong>Enter</strong> または <strong>Space</strong> で打ちたい駒を選びます（自動的に盤面へ戻ります）</li>
            <li>矢印キーで打ちたい場所へ移動し、<strong>Enter</strong> で決定します</li>
        </ol>
        <p style="margin-top: 8px; line-height: 1.8;">
            <small style="color: var(--color-text-secondary);">
                ※駒台で <strong>Escape</strong> を押すと、駒を選ばずに盤面へ戻れます。
                矢印キーで駒台内の駒を切り替えられます。
            </small>
        </p>
    </section>
    
    <section style="margin-top: 48px;" aria-labelledby="keyboard-shortcuts-heading">
        <h3 id="keyboard-shortcuts-heading">キーボードショートカット</h3>
        <p>
            <small style="color: var(--color-text-secondary);">
                ※ショートカットは入力フィールドにフォーカスがない時のみ有効です
            </small>
        </p>
        
        <h4 style="margin-top: 16px;">情報の確認</h4>
        <dl style="line-height: 2; margin-top: 8px;">
            <dt style="font-weight: bold;">B</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                盤面全体の状態を読み上げます
            </dd>
            
            <dt style="font-weight: bold;">S</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                現在のゲーム状態（手番、手数）を読み上げます
            </dd>
            
            <dt style="font-weight: bold;">H</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                ヘルプを表示します（このページ）
            </dd>
        </dl>
        
        <h4 style="margin-top: 16px;">ゲーム操作</h4>
        <dl style="line-height: 2; margin-top: 8px;">
            <dt style="font-weight: bold;">U</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                待ったをします（一手戻す）
            </dd>
            
            <dt style="font-weight: bold;">R</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                ゲームをリセットします
            </dd>
        </dl>
        
        <h4 style="margin-top: 16px;">駒台へ移動</h4>
        <dl style="line-height: 2; margin-top: 8px;">
            <dt style="font-weight: bold;">Shift+T</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                先手の駒台へフォーカスを移動します
            </dd>
            
            <dt style="font-weight: bold;">Shift+G</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                後手の駒台へフォーカスを移動します
            </dd>
        </dl>
    </section>
    
    <section style="margin-top: 48px;" aria-labelledby="screen-reader-heading">
        <h3 id="screen-reader-heading">スクリーンリーダー対応</h3>
        <p>このサイトは以下のスクリーンリーダーでテストされています：</p>
        <ul style="margin-top: 16px; line-height: 1.8;">
            <li>NVDA (Windows)</li>
            <li>JAWS (Windows)</li>
            <li>VoiceOver (macOS, iOS)</li>
        </ul>
        
        <p style="margin-top: 16px;">
            各マスには「3の7 先手の歩」のように位置と駒の情報が読み上げられます。<br>
            空のマスは「5の5 空」と読み上げられます。
        </p>
    </section>
    
    <section style="margin-top: 48px;" aria-labelledby="game-rules-heading">
        <h3 id="game-rules-heading">将棋のルール（簡易版）</h3>
        <p>将棋は2人で対戦するボードゲームです。</p>
        
        <h4 style="margin-top: 24px;">目的</h4>
        <p>相手の王（玉）を詰めることが目的です。</p>
        
        <h4 style="margin-top: 24px;">駒の種類と動き</h4>
        <dl style="line-height: 2; margin-top: 16px;">
            <dt style="font-weight: bold;">歩（ふ）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                前に1マス進む（成ると「と」）
            </dd>
            
            <dt style="font-weight: bold;">香（きょう）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                前方へ直線（成ると「成香」）
            </dd>
            
            <dt style="font-weight: bold;">桂（けい）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                前方へ桂馬跳び（成ると「成桂」）
            </dd>
            
            <dt style="font-weight: bold;">銀（ぎん）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                斜め前後と真前（成ると「成銀」）
            </dd>
            
            <dt style="font-weight: bold;">金（きん）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                前後左右と斜め前（成らない）
            </dd>
            
            <dt style="font-weight: bold;">角（かく）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                斜め方向（成ると「馬」で前後左右にも動ける）
            </dd>
            
            <dt style="font-weight: bold;">飛（ひ）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                前後左右（成ると「龍」で斜めにも動ける）
            </dd>
            
            <dt style="font-weight: bold;">玉/王（ぎょく/おう）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                全方向に1マス
            </dd>
        </dl>
    </section>
    
    <section style="margin-top: 48px;" aria-labelledby="accessibility-heading">
        <h3 id="accessibility-heading">アクセシビリティ機能</h3>
        <ul style="margin-top: 16px; line-height: 1.8;">
            <li><strong>WCAG 2.1 AAA準拠</strong> - 最高レベルのアクセシビリティ基準</li>
            <li><strong>高コントラスト</strong> - コントラスト比8:1以上で見やすい配色</li>
            <li><strong>大きなクリックターゲット</strong> - 最小44×44ピクセル</li>
            <li><strong>セッションタイムアウト警告</strong> - 期限切れ5分前に通知</li>
            <li><strong>ARIAラベル</strong> - スクリーンリーダーで正確な情報を提供</li>
            <li><strong>フォーカスインジケーター</strong> - 現在の位置が常に明確</li>
        </ul>
    </section>
    
    <section style="margin-top: 48px;" aria-labelledby="contact-heading">
        <h3 id="contact-heading">お問い合わせ</h3>
        <p>
            バグや改善要望がありましたら、以下にご連絡ください：<br>
            <a href="mailto:info@a11y-shogi.example.com">info@a11y-shogi.example.com</a>
        </p>
    </section>
    
    <div style="margin-top: 48px;">
        <a href="{{ route('home') }}" class="btn btn-primary">ホームに戻る</a>
    </div>
</div>
@endsection
