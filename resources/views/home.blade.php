@extends('layouts.app')

@section('title', 'ホーム - アクセシブル将棋')

@section('content')
<div class="home-page">
    <h2>アクセシブル将棋へようこそ</h2>
    
    @if($hasActiveGame)
        <section aria-labelledby="continue-game-heading">
            <h3 id="continue-game-heading">進行中のゲーム</h3>
            <p>進行中のゲームがあります。</p>
            <div style="margin-top: 16px;">
                <a href="{{ route('game.show', ['session' => $currentGame->id]) }}" class="btn btn-primary">
                    ゲームを続ける
                </a>
            </div>
        </section>
        
        <hr style="margin: 32px 0; border: none; border-top: 1px solid var(--color-border);">
    @endif
    
    <section aria-labelledby="new-game-heading">
        <h3 id="new-game-heading">新しいゲームを開始</h3>
        
        <form action="{{ route('game.start') }}" method="POST" style="max-width: 600px;">
            @csrf
            
            <div style="margin-bottom: 24px;">
                <fieldset>
                    <legend style="font-weight: bold; margin-bottom: 12px;">難易度を選択</legend>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="difficulty" value="easy" required checked
                                   style="width: 20px; height: 20px;">
                            <span style="font-weight: 500;">初級</span>
                            <span style="color: #666;">- 基本的な手を指すAI</span>
                        </label>
                        
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="difficulty" value="medium" required
                                   style="width: 20px; height: 20px;">
                            <span style="font-weight: 500;">中級</span>
                            <span style="color: #666;">- 戦略的な手を考えるAI</span>
                        </label>
                        
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="difficulty" value="hard" required
                                   style="width: 20px; height: 20px;">
                            <span style="font-weight: 500;">上級</span>
                            <span style="color: #666;">- 高度な読みを行うAI</span>
                        </label>
                    </div>
                </fieldset>
            </div>
            
            <div style="margin-bottom: 24px;">
                <fieldset>
                    <legend style="font-weight: bold; margin-bottom: 12px;">手番を選択</legend>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="color" value="sente" checked
                                   style="width: 20px; height: 20px;">
                            <span style="font-weight: 500;">先手（下側）</span>
                            <span style="color: #666;">- 先に指す</span>
                        </label>
                        
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="color" value="gote"
                                   style="width: 20px; height: 20px;">
                            <span style="font-weight: 500;">後手（上側）</span>
                            <span style="color: #666;">- AIの手の後に指す</span>
                        </label>
                    </div>
                </fieldset>
            </div>
            
            <div style="margin-top: 32px;">
                <button type="submit" class="btn btn-primary" style="font-size: 1.125rem;" id="btn-start-game">
                    ゲームを開始する
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
            アクセシブル将棋は、視覚障がいのある方でも楽しめるように設計された将棋ゲームです。<br>
            スクリーンリーダーに対応し、キーボードのみで操作できます。
        </p>
        
        <ul style="margin-top: 16px; line-height: 1.8;">
            <li><strong>WCAG 2.1 AAA準拠</strong> - 最高レベルのアクセシビリティ基準</li>
            <li><strong>キーボード操作</strong> - マウス不要で全ての機能を利用可能</li>
            <li><strong>スクリーンリーダー対応</strong> - 盤面と駒の状態を音声で確認</li>
            <li><strong>高コントラスト</strong> - 見やすい配色（コントラスト比 8:1以上）</li>
        </ul>
        
        <p style="margin-top: 24px;">
            <a href="{{ route('help') }}" class="btn">操作方法を見る</a>
        </p>
    </section>
</div>
@endsection
