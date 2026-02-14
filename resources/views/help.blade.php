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
            <dt style="font-weight: bold;"><kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd> / <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                盤面上のマス目を移動します（<kbd>W</kbd>=上、<kbd>A</kbd>=左、<kbd>S</kbd>=下、<kbd>D</kbd>=右）
            </dd>
            
            <dt style="font-weight: bold;"><kbd>Enter</kbd> / <kbd>Space</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                駒を選択します。もう一度押すと移動先を決定します
            </dd>
            
            <dt style="font-weight: bold;"><kbd>Escape</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                駒の選択をキャンセルし、合法手ハイライトをクリアします
            </dd>
            
            <dt style="font-weight: bold;"><kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                ボタンなど盤面以外の要素に移動します
            </dd>
        </dl>
        
        <h4 style="margin-top: 32px;">合法手ハイライト</h4>
        <p style="margin-top: 8px; line-height: 1.8;">
            駒を選択すると、移動可能なマスに緑色のドットマーカーが表示されます。
            ハイコントラストモードでも視認できるよう配慮されています。
        </p>

        <h4 style="margin-top: 32px;">持ち駒を打つ方法</h4>
        <p style="margin-top: 8px; line-height: 1.8;">
            取った駒は駒台に並びます。持ち駒を盤面に打つには、次の3ステップで操作します。
        </p>
        <ol style="margin-top: 12px; line-height: 2; padding-left: 24px;">
            <li><kbd>Shift</kbd>+<kbd>T</kbd>（先手の駒台）または <kbd>Shift</kbd>+<kbd>G</kbd>（後手の駒台）を押して、駒台へ移動します</li>
            <li><kbd>Enter</kbd> または <kbd>Space</kbd> で打ちたい駒を選びます（自動的に盤面へ戻ります）</li>
            <li>矢印キー（または<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>）で打ちたい場所へ移動し、<kbd>Enter</kbd> で決定します</li>
        </ol>
        <p style="margin-top: 8px; line-height: 1.8;">
            <small style="color: var(--color-text-secondary);">
                ※駒台で <kbd>Escape</kbd> を押すと、駒を選ばずに盤面へ戻れます。
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
            <dt style="font-weight: bold;"><kbd>B</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                盤面全体の状態を読み上げます
            </dd>
            
            <dt style="font-weight: bold;"><kbd>Shift</kbd>+<kbd>B</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                盤面の差分読み上げ（前回からの変化のみ）
            </dd>
            
            <dt style="font-weight: bold;"><kbd>S</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                現在のゲーム状態（手番、手数、経過時間）を読み上げます
            </dd>
            
            <dt style="font-weight: bold;"><kbd>K</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                棋譜（直近5手）を読み上げます
            </dd>
            
            <dt style="font-weight: bold;"><kbd>I</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                現在のマスを狙っている相手の駒（利き筋）を読み上げます
            </dd>
            
            <dt style="font-weight: bold;"><kbd>H</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                ヘルプを表示します（このページ）
            </dd>
        </dl>
        
        <h4 style="margin-top: 16px;">ゲーム操作</h4>
        <dl style="line-height: 2; margin-top: 8px;">
            <dt style="font-weight: bold;"><kbd>U</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                待ったをします（一手戻す）
            </dd>
            
            <dt style="font-weight: bold;"><kbd>R</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                ゲームをリセットします
            </dd>
        </dl>
        
        <h4 style="margin-top: 16px;">駒台へ移動</h4>
        <dl style="line-height: 2; margin-top: 8px;">
            <dt style="font-weight: bold;"><kbd>Shift</kbd>+<kbd>T</kbd> または <kbd>1</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                先手の駒台へフォーカスを移動します（片手でも操作可能）
            </dd>
            
            <dt style="font-weight: bold;"><kbd>Shift</kbd>+<kbd>G</kbd> または <kbd>2</kbd></dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                後手の駒台へフォーカスを移動します（片手でも操作可能）
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
        <p>将棋は2人で対戦するボードゲームです。9×9マスの盤面で、交互に駒を動かします。</p>
        
        <h4 style="margin-top: 24px;">先手と後手</h4>
        <p style="line-height: 1.8;">先手（下側）が最初に指し、後手（上側）がその後に指します。交互に1手ずつ指していきます。</p>

        <h4 style="margin-top: 24px;">目的</h4>
        <p>相手の王（玉）を逃げられない状態にすること（<ruby>詰<rt>つ</rt></ruby>み）が目的です。王を取るのではなく、どこにも逃げられない状態を作ります。</p>
        
        <h4 style="margin-top: 24px;">駒の種類と動き</h4>
        <dl style="line-height: 2; margin-top: 16px;">
            <dt style="font-weight: bold;">歩（ふ）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                前に1マス進む（成ると「と金」= 金と同じ動き）
            </dd>
            
            <dt style="font-weight: bold;">香（きょう）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                前方へまっすぐ何マスでも進む（成ると金と同じ動き）
            </dd>
            
            <dt style="font-weight: bold;">桂（けい）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                前方へ2マス・横に1マス跳ぶ（途中の駒を飛び越せる唯一の駒。成ると金と同じ動き）
            </dd>
            
            <dt style="font-weight: bold;">銀（ぎん）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                前方3方向と斜め後ろ2方向に1マス（成ると金と同じ動き）
            </dd>
            
            <dt style="font-weight: bold;">金（きん）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                前後左右と斜め前2方向に1マス（成れません）
            </dd>
            
            <dt style="font-weight: bold;">角（かく）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                斜め4方向に何マスでも進む（成ると「馬」= 前後左右にも1マス動ける）
            </dd>
            
            <dt style="font-weight: bold;">飛（ひ）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                前後左右に何マスでも進む（成ると「龍」= 斜めにも1マス動ける）
            </dd>
            
            <dt style="font-weight: bold;">玉/王（ぎょく/おう）</dt>
            <dd style="margin-left: 24px; margin-bottom: 12px;">
                全方向に1マス（成れません。この駒を守るのがゲームの目的です）
            </dd>
        </dl>

        <h4 style="margin-top: 24px;"><ruby>成<rt>な</rt></ruby>り（駒のパワーアップ）</h4>
        <p style="line-height: 1.8;">自分の駒が相手の陣地（<strong>敵陣 = 相手側の3段</strong>）に入る・出る・中で動くとき、駒を裏返して強くできます。これを「成る」といいます。成ると別の動きになります（上の説明のカッコ内を参照）。成るかどうかは自分で選べますが、歩・香・桂は最奥に到達すると必ず成ります。</p>

        <h4 style="margin-top: 24px;">持ち駒を<ruby>打<rt>う</rt></ruby>つ</h4>
        <p style="line-height: 1.8;">将棋の最大の特徴です。相手の駒を取ると「持ち駒」として自分の駒台に並びます。持ち駒は自分の手番に、盤面の空いているマスに置く（打つ）ことができます。ただし以下のルールがあります：</p>
        <ul style="margin-top: 8px; line-height: 1.8;">
            <li><strong><ruby>二歩<rt>にふ</rt></ruby>禁止</strong>: 同じ列（縦の筋）に自分の歩が2枚あってはいけません</li>
            <li>歩・香は最奥の段に打てません（動けなくなるため）</li>
            <li>桂は最奥2段に打てません（動けなくなるため）</li>
            <li>持ち駒は成った状態では打てません（元の駒の状態で打ちます）</li>
        </ul>

        <h4 style="margin-top: 24px;">王手と詰み</h4>
        <p style="line-height: 1.8;">相手の王を次に取れる状態にすることを「<ruby>王手<rt>おうて</rt></ruby>」といいます。王手をかけられたら、必ず王を逃がすか、王手を防がなければなりません。どうやっても王手を防げない状態が「<ruby>詰<rt>つ</rt></ruby>み」で、詰まされた側の負けです。</p>
    </section>
    
    <section style="margin-top: 48px;" aria-labelledby="accessibility-heading">
        <h3 id="accessibility-heading">アクセシビリティ機能</h3>
        <ul style="margin-top: 16px; line-height: 1.8;">
            <li><strong>WCAG 2.1 AAA準拠</strong> - 最高レベルのアクセシビリティ基準</li>
            <li><strong>高コントラスト</strong> - コントラスト比8:1以上で見やすい配色</li>
            <li><strong>大きなクリックターゲット</strong> - 最小48×48ピクセル（WCAG 2.5.8準拠）</li>
            <li><strong>合法手ハイライト</strong> - 駒選択時に移動可能なマスを緑色ドットで表示</li>
            <li><strong>AIハイライト</strong> - AIの最終手を★マーカーで視覚的に表示</li>
            <li><strong>WASD代替ナビゲーション</strong> - 矢印キーに加えWASDでも盤面移動可能</li>
            <li><strong>ショートカットヒント</strong> - 画面内に主要ショートカットを常時表示</li>
            <li><strong>AI思考中スピナー</strong> - AIが考え中のときスピナーで視覚的に通知</li>
            <li><strong>トースト通知</strong> - 移動やエラーを画面上部に視覚的に通知</li>
            <li><strong>盤面差分読み上げ</strong> - Shift+Bで前回からの変化だけ読み上げ</li>
            <li><strong>利き筋情報</strong> - Iキーで現在マスを狙う相手の駒を読み上げ</li>
            <li><strong>表示設定</strong> - 駒の文字サイズ変更・タイマー非表示オプション</li>
            <li><strong>prefers-reduced-motion対応</strong> - OS設定に応じてアニメーションを完全停止</li>
            <li><strong>セッションタイムアウト警告</strong> - 期限切れ5分前に通知</li>
            <li><strong>ARIAラベル</strong> - スクリーンリーダーで正確な情報を提供</li>
            <li><strong>フォーカスインジケーター</strong> - 現在の位置が常に明確</li>
            <li><strong>駒選択状態バー</strong> - 選択中の駒とEscape解除を常時表示</li>
            <li><strong>トースト通知無効化</strong> - 感覚過敏の方向けに通知OFF可能</li>
            <li><strong>フォント変更</strong> - UDデジタル教科書体やBIZ UDゴシックが選択可能</li>
            <li><strong>片手操作対応</strong> - 1/2キーで駒台移動（Shift不要）</li>
            <li><strong>キー入力デバウンス</strong> - 手の震えによる誤操作を防止</li>
            <li><strong>難易度補足</strong> - 「初級（よわい）」のように平易な説明付き</li>
            <li><strong>ふりがな対応</strong> - ボタン名・駒名にルビを付与</li>
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
