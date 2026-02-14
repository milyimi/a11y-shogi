@extends('layouts.app')

@section('title', 'ホーム - アクセシブル将棋')

@section('content')
<div class="home-page">
    <h2>アクセシブル<ruby>将棋<rt>しょうぎ</rt></ruby>へようこそ</h2>
    
    @if($hasActiveGame)
        <section aria-labelledby="continue-game-heading">
            <h3 id="continue-game-heading"><ruby>進行中<rt>しんこうちゅう</rt></ruby>のゲーム</h3>
            @if($currentGame->status === 'paused')
                <p><ruby>一時停止中<rt>いちじていしちゅう</rt></ruby>のゲームがあります。</p>
            @else
                <p><ruby>進行中<rt>しんこうちゅう</rt></ruby>のゲームがあります。</p>
            @endif
            <div style="margin-top: 16px;">
                <a href="{{ route('game.show', ['session' => $currentGame->id]) }}" class="btn btn-primary">
                    ゲームを<ruby>続<rt>つづ</rt></ruby>ける
                </a>
            </div>
        </section>
        
        <hr style="margin: 32px 0; border: none; border-top: 1px solid var(--color-border);">
    @endif
    
    <section aria-labelledby="new-game-heading">
        <h3 id="new-game-heading"><ruby>新<rt>あたら</rt></ruby>しいゲームを<ruby>開始<rt>かいし</rt></ruby></h3>
        
        <form action="{{ route('game.start') }}" method="POST" style="max-width: 600px;">
            @csrf
            
            <div style="margin-bottom: 24px;">
                <fieldset>
                    <legend style="font-weight: bold; margin-bottom: 12px;"><ruby>難易度<rt>なんいど</rt></ruby>を<ruby>選択<rt>せんたく</rt></ruby></legend>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="difficulty" value="easy" required checked
                                   style="width: 20px; height: 20px;">
                            <span style="font-weight: 500;"><ruby>初級<rt>しょきゅう</rt></ruby>（よわい）</span>
                            <span style="color: var(--color-text-secondary);">- <ruby>基本的<rt>きほんてき</rt></ruby>な<ruby>手<rt>て</rt></ruby>を<ruby>指<rt>さ</rt></ruby>すAI</span>
                        </label>
                        
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="difficulty" value="medium" required
                                   style="width: 20px; height: 20px;">
                            <span style="font-weight: 500;"><ruby>中級<rt>ちゅうきゅう</rt></ruby>（ふつう）</span>
                            <span style="color: var(--color-text-secondary);">- <ruby>戦略的<rt>せんりゃくてき</rt></ruby>な<ruby>手<rt>て</rt></ruby>を<ruby>考<rt>かんが</rt></ruby>えるAI</span>
                        </label>
                        
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="difficulty" value="hard" required
                                   style="width: 20px; height: 20px;">
                            <span style="font-weight: 500;"><ruby>上級<rt>じょうきゅう</rt></ruby>（つよい）</span>
                            <span style="color: var(--color-text-secondary);">- <ruby>高度<rt>こうど</rt></ruby>な<ruby>読<rt>よ</rt></ruby>みを<ruby>行<rt>おこな</rt></ruby>うAI</span>
                        </label>
                    </div>
                </fieldset>
            </div>
            
            <div style="margin-bottom: 24px;">
                <fieldset>
                    <legend style="font-weight: bold; margin-bottom: 12px;"><ruby>手番<rt>てばん</rt></ruby>を<ruby>選択<rt>せんたく</rt></ruby></legend>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="color" value="sente" checked
                                   style="width: 20px; height: 20px;">
                            <span style="font-weight: 500;"><ruby>先手<rt>せんて</rt></ruby>（<ruby>下側<rt>したがわ</rt></ruby>）</span>
                            <span style="color: var(--color-text-secondary);">- <ruby>先<rt>さき</rt></ruby>に<ruby>指<rt>さ</rt></ruby>す</span>
                        </label>
                        
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="color" value="gote"
                                   style="width: 20px; height: 20px;">
                            <span style="font-weight: 500;"><ruby>後手<rt>ごて</rt></ruby>（<ruby>上側<rt>うえがわ</rt></ruby>）</span>
                            <span style="color: var(--color-text-secondary);">- AIの<ruby>手<rt>て</rt></ruby>の<ruby>後<rt>あと</rt></ruby>に<ruby>指<rt>さ</rt></ruby>す</span>
                        </label>
                    </div>
                </fieldset>
            </div>
            
            <div style="margin-top: 32px;">
                <button type="submit" class="btn btn-primary" style="font-size: 1.125rem;" id="btn-start-game">
                    ゲームを<ruby>開始<rt>かいし</rt></ruby>する
                </button>
            </div>
        </form>
        
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const form = document.querySelector('form[action="{{ route("game.start") }}"]');
                if (form) {
                    form.addEventListener('submit', function(e) {
                        const btn = document.getElementById('btn-start-game');
                        btn.disabled = true;
                        btn.textContent = '開始中...';
                    });
                }
            });
        </script>
    </section>
    
    <section style="margin-top: 48px;" aria-labelledby="about-heading">
        <h3 id="about-heading">このサイトについて</h3>
        <p>
            アクセシブル<ruby>将棋<rt>しょうぎ</rt></ruby>は、さまざまな<ruby>障<rt>しょう</rt></ruby>がいのある<ruby>方<rt>かた</rt></ruby>でも<ruby>楽<rt>たの</rt></ruby>しめるように<ruby>設計<rt>せっけい</rt></ruby>された<ruby>将棋<rt>しょうぎ</rt></ruby>ゲームです。<br>
            スクリーンリーダーに<ruby>対応<rt>たいおう</rt></ruby>し、キーボードのみで<ruby>操作<rt>そうさ</rt></ruby>できます。
        </p>
        
        <ul style="margin-top: 16px; line-height: 1.8;">
            <li><strong>WCAG 2.1 AAA<ruby>準拠<rt>じゅんきょ</rt></ruby></strong> - <ruby>最高<rt>さいこう</rt></ruby>レベルのアクセシビリティ<ruby>基準<rt>きじゅん</rt></ruby></li>
            <li><strong>キーボード<ruby>操作<rt>そうさ</rt></ruby></strong> - マウス<ruby>不要<rt>ふよう</rt></ruby>で<ruby>全<rt>すべ</rt></ruby>ての<ruby>機能<rt>きのう</rt></ruby>を<ruby>利用<rt>りよう</rt></ruby><ruby>可能<rt>かのう</rt></ruby></li>
            <li><strong>スクリーンリーダー<ruby>対応<rt>たいおう</rt></ruby></strong> - <ruby>盤面<rt>ばんめん</rt></ruby>と<ruby>駒<rt>こま</rt></ruby>の<ruby>状態<rt>じょうたい</rt></ruby>を<ruby>音声<rt>おんせい</rt></ruby>で<ruby>確認<rt>かくにん</rt></ruby></li>
            <li><strong><ruby>高<rt>こう</rt></ruby>コントラスト</strong> - <ruby>見<rt>み</rt></ruby>やすい<ruby>配色<rt>はいしょく</rt></ruby>（コントラスト<ruby>比<rt>ひ</rt></ruby> 8:1<ruby>以上<rt>いじょう</rt></ruby>）</li>
            <li><strong><ruby>色覚<rt>しきかく</rt></ruby>サポート</strong> - <ruby>色<rt>いろ</rt></ruby>だけに<ruby>頼<rt>たよ</rt></ruby>らない<ruby>表示<rt>ひょうじ</rt></ruby>（<ruby>形<rt>かたち</rt></ruby>・<ruby>記号<rt>きごう</rt></ruby>・テキストで<ruby>区別<rt>くべつ</rt></ruby>）</li>
            <li><strong><ruby>感覚過敏<rt>かんかくかびん</rt></ruby><ruby>配慮<rt>はいりょ</rt></ruby></strong> - アニメーション<ruby>無効化<rt>むこうか</rt></ruby>・<ruby>通知<rt>つうち</rt></ruby>OFF<ruby>設定<rt>せってい</rt></ruby><ruby>対応<rt>たいおう</rt></ruby></li>
        </ul>
        
        <div style="margin-top: 24px; padding: 16px; background: var(--color-surface); border: 2px solid var(--color-primary); border-radius: 8px;">
            <p style="margin: 0; font-weight: bold;">🎮 はじめての<ruby>方<rt>かた</rt></ruby>へ</p>
            <p style="margin: 8px 0 0 0;">キーボードだけで<ruby>操作<rt>そうさ</rt></ruby>できます。<ruby>矢印<rt>やじるし</rt></ruby>キーで<ruby>盤面<rt>ばんめん</rt></ruby>を<ruby>移動<rt>いどう</rt></ruby>し、Enterキーで<ruby>駒<rt>こま</rt></ruby>を<ruby>選択<rt>せんたく</rt></ruby>・<ruby>移動<rt>いどう</rt></ruby>します。<br>
            <ruby>対局中<rt>たいきょくちゅう</rt></ruby>はBキーで<ruby>盤面<rt>ばんめん</rt></ruby>の<ruby>読<rt>よ</rt></ruby>み<ruby>上<rt>あ</rt></ruby>げ、Sキーでゲーム<ruby>状態<rt>じょうたい</rt></ruby>の<ruby>確認<rt>かくにん</rt></ruby>ができます。</p>
            <p style="margin: 12px 0 0 0;">
                <a href="{{ route('help') }}" class="btn"><ruby>詳<rt>くわ</rt></ruby>しい<ruby>操作方法<rt>そうさほうほう</rt></ruby>を<ruby>見<rt>み</rt></ruby>る</a>
            </p>
        </div>
    </section>
</div>
@endsection
