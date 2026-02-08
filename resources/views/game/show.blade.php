@extends('layouts.app')

@section('title', 'ゲーム - アクセシブル将棋')

@push('styles')
<style>
    .game-container {
        display: grid;
        grid-template-columns: 200px 1fr 300px;
        grid-template-rows: auto auto;
        gap: 16px;
        max-width: 1400px;
        margin: 24px auto;
    }
    
    .komadai:first-of-type {
        grid-column: 1;
        grid-row: 1;
    }
    
    .board-section {
        grid-column: 2;
        grid-row: 1 / 3;
    }
    
    .info-panel {
        grid-column: 3;
        grid-row: 1 / 3;
    }
    
    .komadai:last-of-type {
        grid-column: 1;
        grid-row: 2;
    }
    
    .komadai, .info-panel {
        background: var(--color-surface);
        border: 2px solid var(--color-border);
        padding: 16px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
    }
    
    .komadai {
        max-height: 180px;
        overflow-y: auto;
    }
    
    .komadai h3 {
        margin: 0 0 12px 0;
        flex-shrink: 0;
    }
    
    .komadai .hand-pieces {
        flex: 1;
        overflow-y: auto;
    }
    
    .board-section {
        background: #FFF;
        border: 2px solid var(--color-border);
        padding: 16px;
        border-radius: 8px;
    }
    
    .shogi-board {
        display: grid;
        grid-template-columns: repeat(9, 1fr);
        grid-template-rows: repeat(9, 1fr);
        max-width: 540px;
        margin: 0 auto;
        border: 3px solid var(--color-board-border, #8B4513);
        background: var(--color-board-bg, #DEB887);
    }

    .shogi-board > [role="row"] {
        display: contents;
    }
    
    .cell {
        aspect-ratio: 1;
        border: 1px solid var(--color-board-border, #8B4513);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: bold;
        background: var(--color-cell-bg, #E6D2B5);
        cursor: pointer;
        transition: background-color 0.2s, box-shadow 0.2s;
        color: var(--color-text);
    }
    
    .cell:hover, .cell:focus {
        background: var(--color-cell-focus, #C8AD8A);
        outline: 4px solid var(--color-focus);
        outline-offset: -4px;
        box-shadow: inset 0 0 0 6px rgba(255, 140, 0, 0.4);
    }
    
    html.high-contrast .cell:hover,
    html.high-contrast .cell:focus {
        background: #BBBBBB;
        outline: 4px solid #FF8C00;
        box-shadow: inset 0 0 0 6px rgba(255, 140, 0, 0.5);
    }
    
    .cell[data-selected="true"] {
        background: var(--color-focus);
        box-shadow: inset 0 0 0 2px #FF8C00, 0 0 0 3px #FF8C00;
    }
    
    .piece-sente {
        color: #000000;
    }
    
    .piece-gote {
        color: var(--color-gote, #CC0000);
        transform: rotate(180deg);
    }

    /* ダークモード */
    html.high-contrast .shogi-board {
        --color-board-border: #AA8855;
        --color-board-bg: #3D2B1F;
    }
    html.high-contrast .cell {
        --color-cell-bg: #4A3728;
        --color-cell-focus: #5C4433;
        border-color: #D4A843;
    }
    html.high-contrast .piece-sente {
        color: #F0E0C8;
    }
    html.high-contrast .piece-gote {
        color: #99DDFF;
    }
    html.high-contrast .cell[data-selected="true"] {
        background: #7A5A00;
        box-shadow: inset 0 0 0 3px #FF8C00, 0 0 0 3px #FF8C00;
    }
    html.high-contrast .cell:hover,
    html.high-contrast .cell:focus {
        background: #5C4433;
        outline-color: #FF8C00;
    }
    
    .hand-pieces {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
        min-height: 48px;
    }
    
    .hand-piece {
        padding: 8px 12px;
        background: var(--color-bg);
        border: 2px solid var(--color-text);
        border-radius: 4px;
        font-weight: bold;
        cursor: pointer;
        color: var(--color-text);
        min-height: 40px;
        display: flex;
        align-items: center;
        transition: background-color 0.2s, box-shadow 0.2s;
    }
    
    .hand-piece:hover, .hand-piece:focus {
        background: #E6F3FF;
        box-shadow: inset 0 0 0 3px var(--color-focus);
    }

    html.high-contrast .hand-piece:hover,
    html.high-contrast .hand-piece:focus {
        background: #3A3A3A;
    }

    .hand-piece[data-selected="true"] {
        background: #FFD700;
        box-shadow: inset 0 0 0 2px #FF8C00, 0 0 0 3px #FF8C00;
    }

    html.high-contrast .hand-piece[data-selected="true"] {
        background: #7A5A00;
    }
    
    .move-history {
        max-height: 300px;
        overflow-y: auto;
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        padding: 12px;
        margin-top: 12px;
        border-radius: 4px;
    }
    
    .move-history ol {
        list-style: decimal;
        padding-left: 24px;
    }
    
    .move-history li {
        margin-bottom: 8px;
        line-height: 1.6;
    }
    
    @media (max-width: 1199px) {
        .game-container {
            grid-template-columns: 180px 1fr 280px;
        }
    }
    
    @media (max-width: 767px) {
        .game-container {
            grid-template-columns: 1fr;
        }
        
        .komadai, .info-panel {
            order: 2;
        }
        
        .board-section {
            order: 1;
        }
        
        .cell {
            font-size: 18px;
        }
    }
    
    /* ランキング登録ダイアログスタイル */
    #ranking-registration-dialog[style*="display: flex"] {
        display: flex !important;
    }

    html.high-contrast .pause-banner {
        background: #3D3520 !important;
        border-color: #AA8855 !important;
    }
    html.high-contrast .pause-banner p {
        color: #F0E0C8 !important;
    }
</style>
@endpush

@section('content')
<div class="game-page">
    <h2 class="sr-only">将棋ゲーム</h2>
    
    {{-- ゲーム状態を表示 --}}
    @if($game->status === 'paused')
        <div class="pause-banner" style="background: #FFF3CD; border: 2px solid #B8860B; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0; color: #664D03;"><strong>一時停止中</strong>：このゲームは一度中断されています。再開するか、ホームに戻るかを選択できます。</p>
        </div>
    @endif
    
    {{-- ゲーム専用のARIAライブリージョン --}}
    <div aria-live="assertive" aria-atomic="true" class="sr-only" id="game-announcements"></div>
    <div aria-live="polite" aria-atomic="true" class="sr-only" id="game-status"></div>
    
    <div class="game-container">
        {{-- 駒台（後手） --}}
        <aside class="komadai" aria-labelledby="gote-komadai-heading">
            <h3 id="gote-komadai-heading">後手の駒台</h3>
            <div class="hand-pieces" id="gote-hand" aria-label="後手の持ち駒">
                @if(!empty($gameState['boardState']['hand']['gote']))
                    @php
                        $pieceNameMap = [
                            'fu' => '歩',
                            'kyosha' => '香',
                            'keima' => '桂',
                            'gin' => '銀',
                            'kin' => '金',
                            'kaku' => '角',
                            'hisha' => '飛',
                            'tokin' => 'と金',
                            'nkyosha' => '成香',
                            'nkeima' => '成桂',
                            'ngin' => '成銀',
                            'uma' => '馬',
                            'ryu' => '龍',
                        ];
                    @endphp
                    @foreach($gameState['boardState']['hand']['gote'] as $piece => $count)
                        <button type="button" class="hand-piece" data-piece="{{ $piece }}" data-color="gote">
                            {{ $pieceNameMap[$piece] ?? $piece }} × {{ $count }}
                        </button>
                    @endforeach
                @else
                    <p style="color: var(--color-text-secondary);">持ち駒なし</p>
                @endif
            </div>
        </aside>
        
        {{-- 盤面 --}}
        <main class="board-section" aria-labelledby="board-heading">
            <h3 id="board-heading" class="sr-only">将棋盤</h3>
            
            <div role="grid" aria-label="将棋盤 9×9マス" class="shogi-board" id="shogi-board">
                @for($rank = 9; $rank >= 1; $rank--)
                    <div role="row" aria-label="{{ $rank }}段目">
                    @for($file = 9; $file >= 1; $file--)
                        @php
                            $cell = $gameState['boardState']['board'][$rank][$file] ?? null;
                            $pieceText = '';
                            $pieceClass = '';
                            $ariaLabel = "{$file}の{$rank}";
                            
                            $pieceNameMap = [
                                'fu' => '歩',
                                'kyosha' => '香',
                                'keima' => '桂',
                                'gin' => '銀',
                                'kin' => '金',
                                'kaku' => '角',
                                'hisha' => '飛',
                                'gyoku' => '玉',
                                'ou' => '王',
                                'tokin' => 'と金',
                                'nkyosha' => '成香',
                                'nkeima' => '成桂',
                                'ngin' => '成銀',
                                'uma' => '馬',
                                'ryu' => '龍',
                            ];
                            
                            if ($cell) {
                                $pieceName = $pieceNameMap[$cell['type']] ?? $cell['type'];
                                $pieceText = $pieceName;
                                $pieceClass = 'piece-' . $cell['color'];
                                $colorName = $cell['color'] === 'sente' ? '先手' : '後手';
                                $ariaLabel .= " {$colorName}の{$pieceName}";
                            } else {
                                $ariaLabel .= " 空";
                            }
                        @endphp
                        
                        <button
                            type="button"
                            class="cell {{ $pieceClass }}"
                            role="gridcell"
                            data-rank="{{ $rank }}"
                            data-file="{{ $file }}"
                            aria-label="{{ $ariaLabel }}"
                            tabindex="{{ ($rank === 9 && $file === 9) ? 0 : -1 }}"
                        ><span class="piece-text">{{ $pieceText }}</span></button>
                    @endfor
                    </div>
                @endfor
            </div>
        </main>
        
        {{-- ランキング登録ダイアログ --}}
        <div id="ranking-registration-dialog" role="dialog" aria-modal="true" aria-labelledby="ranking-dialog-title" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); align-items: center; justify-content: center; z-index: 2000;">
            <div style="background: var(--color-bg); border: 4px solid var(--color-border); border-radius: 8px; padding: 32px; max-width: 500px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); color: var(--color-text);">
                <h2 id="ranking-dialog-title" style="margin-top: 0; margin-bottom: 16px; font-size: 1.5rem;">🎉 ランキングに登録しますか？</h2>
                
                <p id="ranking-dialog-message" style="margin-bottom: 24px; font-size: 1.1rem; line-height: 1.6;">
                    おめでとうございます！AIに勝利しました。
                    <br>ニックネームを入力してランキングに登録してください。
                </p>
                
                <div id="ranking-input-section" style="margin-bottom: 24px;">
                    <label for="ranking-nickname-input" style="display: block; margin-bottom: 8px; font-weight: bold;">
                        ニックネーム（3〜15文字）:
                    </label>
                    <input 
                        type="text" 
                        id="ranking-nickname-input" 
                        placeholder="例: 将棋マスター"
                        maxlength="15"
                        style="width: 100%; padding: 12px; font-size: 1rem; border: 2px solid var(--color-border); border-radius: 4px; box-sizing: border-box; background: var(--color-bg); color: var(--color-text);"
                    >
                    <small style="display: block; margin-top: 4px; color: var(--color-text-secondary);">3〜15文字で入力してください</small>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                    <div>
                        <strong>難易度:</strong>
                        <span style="font-size: 1.1rem;">
                            @if($game->difficulty === 'easy')
                                初級
                            @elseif($game->difficulty === 'medium')
                                中級
                            @else
                                上級
                            @endif
                        </span>
                    </div>
                    <div>
                        <strong>手数:</strong>
                        <span style="font-size: 1.1rem;" id="ranking-moves">{{ $game->total_moves ?? 0 }}手</span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button 
                        id="btn-register-ranking" 
                        class="btn btn-primary" 
                        style="flex: 1; padding: 12px; font-size: 1rem; cursor: pointer;"
                    >
                        ランキングに登録
                    </button>
                    <button 
                        id="btn-skip-ranking" 
                        class="btn btn-secondary" 
                        style="flex: 1; padding: 12px; font-size: 1rem; cursor: pointer;"
                    >
                        スキップ
                    </button>
                </div>
            </div>
        </div>
        
        {{-- 情報パネル --}}
        <aside class="info-panel" aria-labelledby="info-heading">
            <section aria-labelledby="game-info-heading">
                <h3 id="game-info-heading">ゲーム情報</h3>
                <dl style="line-height: 2;" role="list">
                    <div role="listitem" style="margin-bottom: 8px;">
                        <dt style="font-weight: bold; display: inline;">難易度:</dt>
                        <dd style="display: inline; margin-left: 8px;">{{ $game->difficulty === 'easy' ? '初級' : ($game->difficulty === 'medium' ? '中級' : '上級') }}</dd>
                    </div>
                    
                    <div role="listitem" style="margin-bottom: 8px;">
                        <dt style="font-weight: bold; display: inline;">現在の手番:</dt>
                        <dd style="display: inline; margin-left: 8px;" id="current-player">
                            {{ $gameState['currentPlayer'] === 'human' ? 'あなた' : 'AI' }}
                            ({{ $game->human_color === 'sente' ? '先手' : '後手' }})
                        </dd>
                    </div>
                    
                    <div role="listitem" style="margin-bottom: 8px;">
                        <dt style="font-weight: bold; display: inline;">手数:</dt>
                        <dd style="display: inline; margin-left: 8px;" id="move-count">{{ $gameState['moveCount'] }}手</dd>
                    </div>
                    
                    <div role="listitem">
                        <dt style="font-weight: bold; display: inline;">経過時間:</dt>
                        <dd style="display: inline; margin-left: 8px;" id="elapsed-time">
                            @php
                                $minutes = floor($gameState['elapsedSeconds'] / 60);
                                $seconds = $gameState['elapsedSeconds'] % 60;
                            @endphp
                            {{ $minutes }}分{{ $seconds }}秒
                        </dd>
                    </div>
                </dl>
            </section>
            
            <section aria-labelledby="actions-heading" style="margin-top: 24px;">
                <h3 id="actions-heading">操作</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button type="button" class="btn" id="btn-undo" disabled>
                        待ったをする
                    </button>
                    <button type="button" class="btn" id="btn-resign">
                        投了する
                    </button>
                    <button type="button" class="btn" id="btn-reset">
                        リセット
                    </button>
                    <button type="button" class="btn btn-secondary" id="btn-quit">
                        ホームに戻る
                    </button>
                </div>
            </section>
            
            <section aria-labelledby="history-heading" style="margin-top: 24px;">
                <h3 id="history-heading">棋譜</h3>
                <div class="move-history" id="move-history" aria-live="polite">
                    @if(!empty($gameState['moveHistory']))
                        <ol>
                            @foreach($gameState['moveHistory'] as $index => $move)
                                <li>{{ $move }}</li>
                            @endforeach
                        </ol>
                    @else
                        <p style="color: var(--color-text-secondary);">まだ指し手がありません</p>
                    @endif
                </div>
            </section>
        </aside>
        
        {{-- 駒台（先手） --}}
        <aside class="komadai" aria-labelledby="sente-komadai-heading">
            <h3 id="sente-komadai-heading">先手の駒台</h3>
            <div class="hand-pieces" id="sente-hand" aria-label="先手の持ち駒">
                @if(!empty($gameState['boardState']['hand']['sente']))
                    @php
                        $pieceNameMap = [
                            'fu' => '歩',
                            'kyosha' => '香',
                            'keima' => '桂',
                            'gin' => '銀',
                            'kin' => '金',
                            'kaku' => '角',
                            'hisha' => '飛',
                            'tokin' => 'と金',
                            'nkyosha' => '成香',
                            'nkeima' => '成桂',
                            'ngin' => '成銀',
                            'uma' => '馬',
                            'ryu' => '龍',
                        ];
                    @endphp
                    @foreach($gameState['boardState']['hand']['sente'] as $piece => $count)
                        <button type="button" class="hand-piece" data-piece="{{ $piece }}" data-color="sente">
                            {{ $pieceNameMap[$piece] ?? $piece }} × {{ $count }}
                        </button>
                    @endforeach
                @else
                    <p style="color: var(--color-text-secondary);">持ち駒なし</p>
                @endif
            </div>
        </aside>
    </div>
</div>

<script>
    // ゲームデータを埋め込み
    window.gameData = @json($gameState);
    window.gameSessionId = {{ $game->id }};
    
    console.log('[INIT] Window gameData:', window.gameData);
    console.log('[INIT] gameData.currentPlayer:', window.gameData.currentPlayer);
    console.log('[INIT] game.human_color:', @json($game->human_color));

    
    // フォーカス管理（グローバルアクセス可能にする）
    window.focusedCell = { rank: 9, file: 9 };
    let selectedCell = null;
    
    function updateFocus() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const rank = parseInt(cell.dataset.rank);
            const file = parseInt(cell.dataset.file);
            
            if (rank === window.focusedCell.rank && file === window.focusedCell.file) {
                cell.tabIndex = 0;
                cell.focus();
            } else {
                cell.tabIndex = -1;
            }
        });
    }
    
    // ゲーム終了時のランキング登録ダイアログを表示
    function showRankingRegistrationDialog() {
        const gameData = window.gameData || {};
        
        // ゲームが終了した場合に表示
        if (gameData.status && gameData.status !== 'in_progress') {
            const isHumanWin = gameData.status === 'mate' && gameData.winner === 'human';

            // 既に表示済みか確認
            const rankingDialog = document.getElementById('ranking-registration-dialog');
            if (rankingDialog && !rankingDialog.dataset.shown) {
                const titleEl = document.getElementById('ranking-dialog-title');
                const messageEl = document.getElementById('ranking-dialog-message');
                const inputSection = document.getElementById('ranking-input-section');
                const registerBtn = document.getElementById('btn-register-ranking');
                const skipBtn = document.getElementById('btn-skip-ranking');

                rankingDialog.dataset.shown = 'true';
                rankingDialog.style.display = 'flex';

                if (isHumanWin) {
                    if (titleEl) titleEl.textContent = '🎉 ランキングに登録しますか？';
                    if (messageEl) {
                        messageEl.innerHTML = 'おめでとうございます！AIに勝利しました。<br>ニックネームを入力してランキングに登録してください。';
                    }
                    if (inputSection) inputSection.style.display = '';
                    if (registerBtn) {
                        registerBtn.style.display = '';
                        registerBtn.disabled = false;
                    }
                    if (skipBtn) skipBtn.textContent = 'スキップ';

                    // ニックネーム入力にフォーカス
                    setTimeout(() => {
                        const nicknameInput = document.getElementById('ranking-nickname-input');
                        if (nicknameInput) {
                            nicknameInput.focus({ preventScroll: true });
                        }
                    }, 100);
                } else {
                    if (titleEl) titleEl.textContent = '対局が終了しました';
                    if (messageEl) {
                        messageEl.innerHTML = '今回はランキング登録の対象外です。<br>ランキングを見ることができます。';
                    }
                    if (inputSection) inputSection.style.display = 'none';
                    if (registerBtn) {
                        registerBtn.style.display = 'none';
                        registerBtn.disabled = true;
                    }
                    if (skipBtn) skipBtn.textContent = '閉じる';

                    // 閉じるボタンにフォーカス
                    setTimeout(() => {
                        if (skipBtn) {
                            skipBtn.focus({ preventScroll: true });
                        }
                    }, 100);
                }
                
                // Escキーでダイアログを閉じる
                const handleEscape = (e) => {
                    if (e.key === 'Escape') {
                        rankingDialog.style.display = 'none';
                        const announcement = isHumanWin
                            ? 'ランキング登録をキャンセルしました'
                            : '対局を終了しました';
                        document.getElementById('game-announcements').textContent = announcement;
                        const firstCell = document.querySelector('.cell');
                        if (firstCell) firstCell.focus();
                        document.removeEventListener('keydown', handleEscape);
                    }
                };
                document.addEventListener('keydown', handleEscape);
            }
        }
    }
</script>
@endsection

@push('scripts')
<script>
    // ページ読み込み時にランキング登録ダイアログの表示フラグをリセット
    const rankingDialog = document.getElementById('ranking-registration-dialog');
    if (rankingDialog) {
        rankingDialog.dataset.shown = '';
    }
    
    // キーボード操作対応
    document.addEventListener('DOMContentLoaded', function() {
        const cells = document.querySelectorAll('.cell');
        const handPieces = document.querySelectorAll('.hand-piece');
        const humanColor = @json($game->human_color);
        let currentPlayer = window.gameData.currentPlayer || 'human';
        
        console.log('[Init] currentPlayer:', currentPlayer, 'humanColor:', humanColor);
        
        let fromCell = null; // 移動元の駒
        let selectedHandPiece = null;
        
        // 初期フォーカスを設定
        updateFocus();
        
        // グローバルキーボードショートカット
        document.addEventListener('keydown', function(e) {
            // 成りダイアログが開いている場合はショートカット無効
            if (document.getElementById('promotion-dialog')) {
                return;
            }
            
            // 入力フォームにフォーカスがある場合はショートカット無効
            if (document.activeElement.tagName === 'INPUT' || 
                document.activeElement.tagName === 'TEXTAREA') {
                return;
            }
            
            switch(e.key.toUpperCase()) {
                case 'B':
                    // 盤面全体を読み上げ
                    e.preventDefault();
                    announceBoardState();
                    break;
                case 'S':
                    // ゲーム状態を読み上げ
                    e.preventDefault();
                    announceGameStatus();
                    break;
                case 'H':
                    // ヘルプページに移動
                    if (e.shiftKey === false) {
                        e.preventDefault();
                        window.location.href = '/help';
                    }
                    break;
                case 'U':
                    // 待った（undo）
                    e.preventDefault();
                    handleUndo();
                    break;
                case 'R':
                    // リセット
                    e.preventDefault();
                    handleReset();
                    break;
                case 'T':
                    // Shift+T: 先手駒台の表示/非表示
                    if (e.shiftKey) {
                        e.preventDefault();
                        toggleHandPieces('sente');
                    }
                    break;
                case 'G':
                    // Shift+G: 後手駒台の表示/非表示
                    if (e.shiftKey) {
                        e.preventDefault();
                        toggleHandPieces('gote');
                    }
                    break;
            }
        });
        
        // 盤面全体を読み上げ
        function announceBoardState() {
            let announcement = '盤面: ';
            const cells = document.querySelectorAll('.cell');
            cells.forEach(cell => {
                const rank = cell.dataset.rank;
                const file = cell.dataset.file;
                const piece = cell.textContent.trim();
                if (piece) {
                    announcement += `${file}の${rank}に${piece}。`;
                } else {
                    announcement += `${file}の${rank}は空。`;
                }
            });
            document.getElementById('game-announcements').textContent = announcement;
        }
        
        // ゲーム状態を読み上げ
        function announceGameStatus() {
            const difficulty = document.querySelector('.info-panel').textContent;
            const currentPlayer = document.getElementById('current-player').textContent;
            const moveCount = document.getElementById('move-count').textContent;
            const announcement = `難易度: ${difficulty}。 現在の手番: ${currentPlayer}。 手数: ${moveCount}。`;
            document.getElementById('game-announcements').textContent = announcement;
        }
        
        async function fetchJson(url, options = {}) {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...options.headers,
                },
            });

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const data = await response.json();
                if (!response.ok && data && typeof data.success === 'undefined') {
                    return {
                        success: false,
                        message: data.message || `HTTP ${response.status}`,
                        errors: data.errors || null,
                    };
                }
                return data;
            }

            const text = await response.text();
            return {
                success: false,
                message: text ? text.slice(0, 200) : `HTTP ${response.status}`,
            };
        }

        function isGameOver() {
            return window.gameData && window.gameData.status && window.gameData.status !== 'in_progress';
        }

        // 待った（undo）
        function handleUndo() {
            if (confirm('一手前に戻しますか？')) {
                fetchJson(`/game/{{ $game->id }}/undo`, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'Content-Type': 'application/json',
                    },
                })
                .then(data => {
                    if (data.success) {
                        location.reload();
                        document.getElementById('game-announcements').textContent = '一手前に戻しました';
                    } else {
                        alert(data.message || '待った処理に失敗しました');
                    }
                })
                .catch(error => {
                    console.warn('Error:', error);
                    alert('エラーが発生しました');
                });
            }
        }
        
        // リセット
        function handleReset() {
            if (confirm('ゲームをリセットしますか？')) {
                fetchJson(`/game/{{ $game->id }}/reset`, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'Content-Type': 'application/json',
                    },
                })
                .then(data => {
                    if (data.success) {
                        location.reload();
                        document.getElementById('game-announcements').textContent = 'ゲームをリセットしました';
                    } else {
                        alert(data.message || 'リセット処理に失敗しました');
                    }
                })
                .catch(error => {
                    console.warn('Error:', error);
                    alert('エラーが発生しました');
                });
            }
        }
        
        // 駒台の表示/非表示を切り替え
        function toggleHandPieces(color) {
            const komadaiElements = document.querySelectorAll('.komadai');
            komadaiElements.forEach(el => {
                const heading = el.querySelector('h3');
                if (heading && heading.textContent.includes(color === 'sente' ? '先手' : '後手')) {
                    const isVisible = el.style.display !== 'none';
                    el.style.display = isVisible ? 'none' : 'flex';
                    const announcement = `${color === 'sente' ? '先手' : '後手'}駒台を${isVisible ? '非表示' : '表示'}にしました`;
                    document.getElementById('game-announcements').textContent = announcement;
                }
            });
        }
        
        cells.forEach(cell => {
            cell.addEventListener('click', function() {
                // クリック時に focusedCell を同期（矢印キーナビゲーションとの整合性）
                const clickedRank = parseInt(this.dataset.rank);
                const clickedFile = parseInt(this.dataset.file);
                window.focusedCell.rank = clickedRank;
                window.focusedCell.file = clickedFile;
                // tabIndex を更新
                cells.forEach(c => {
                    c.tabIndex = -1;
                });
                this.tabIndex = 0;
                handleCellSelect(this);
            });
            
            cell.addEventListener('keydown', function(e) {
                const rank = parseInt(this.dataset.rank);
                const file = parseInt(this.dataset.file);
                let newRank = rank;
                let newFile = file;
                let handled = false;
                
                switch(e.key) {
                    case 'ArrowUp':
                        if (rank < 9) newRank++;
                        handled = true;
                        break;
                    case 'ArrowDown':
                        if (rank > 1) newRank--;
                        handled = true;
                        break;
                    case 'ArrowLeft':
                        if (file > 1) newFile--;
                        handled = true;
                        break;
                    case 'ArrowRight':
                        if (file < 9) newFile++;
                        handled = true;
                        break;
                    case 'Enter':
                    case ' ':
                        handleCellSelect(this);
                        handled = true;
                        break;
                    case 'Escape':
                        if (fromCell) {
                            fromCell.removeAttribute('data-selected');
                            fromCell = null;
                            document.getElementById('game-announcements').textContent = '選択をキャンセルしました';
                            handled = true;
                        }
                        break;
                }
                
                if (handled) {
                    e.preventDefault();
                    if (newRank !== rank || newFile !== file) {
                        window.focusedCell.rank = newRank;
                        window.focusedCell.file = newFile;
                        updateFocus();
                        
                        const newCell = document.querySelector(
                            `.cell[data-rank="${newRank}"][data-file="${newFile}"]`
                        );
                        if (newCell) {
                            document.getElementById('game-status').textContent = newCell.getAttribute('aria-label');
                        }
                    }
                }
            });
        });

        handPieces.forEach(button => {
            button.addEventListener('click', handleHandPieceSelect);
        });
        
        function handleCellSelect(cell) {
            if (isGameOver()) {
                document.getElementById('game-announcements').textContent = 'ゲームは終了しています';
                return;
            }
            const rank = parseInt(cell.dataset.rank);
            const file = parseInt(cell.dataset.file);
            
            console.log('[handleCellSelect] rank:', rank, 'file:', file, 'selectedHandPiece:', selectedHandPiece);
            
            // そのマスに駒があるか確認
            const piece = window.gameData.boardState.board[rank]?.[file];
            
            // 駒台から駒を選択している場合
            if (selectedHandPiece) {
                // マスに駒がない場合のみドロップ可能
                if (!piece) {
                    console.log('[handleCellSelect] dropping piece:', selectedHandPiece.type, 'to', file, rank);
                    document.querySelectorAll('.hand-piece[data-selected="true"]').forEach(button => {
                        button.removeAttribute('data-selected');
                    });
                    makeDrop(selectedHandPiece.type, file, rank);
                    selectedHandPiece = null;
                    return;
                } else {
                    // マスに駒がある場合は駒台選択をキャンセルして通常の移動に処理
                    console.log('[handleCellSelect] マス上に駒があるため、駒台選択をキャンセルして通常移動に切り替え');
                    document.querySelectorAll('.hand-piece[data-selected="true"]').forEach(button => {
                        button.removeAttribute('data-selected');
                    });
                    selectedHandPiece = null;
                    // その後、通常の移動処理に落ちる
                }
            }

            if (!fromCell) {
                // 移動元を選択
                // 空マスや相手の駒を選択しようとした場合はフィードバック
                if (!piece) {
                    document.getElementById('game-announcements').textContent = 
                        `${file}の${rank}は空です。駒のあるマスを選択してください`;
                    return;
                }
                if (piece.color !== humanColor) {
                    document.getElementById('game-announcements').textContent = 
                        `${file}の${rank}は相手の駒です。自分の駒を選択してください`;
                    return;
                }
                fromCell = cell;
                cell.setAttribute('data-selected', 'true');
                const pieceName = {
                    'fu': '歩', 'kyosha': '香', 'keima': '桂', 'gin': '銀',
                    'kin': '金', 'kaku': '角', 'hisha': '飛', 'gyoku': '玉', 'ou': '王',
                    'tokin': 'と金', 'nkyosha': '成香', 'nkeima': '成桂', 'ngin': '成銀',
                    'uma': '馬', 'ryu': '龍'
                }[piece.type] || piece.type;
                document.getElementById('game-announcements').textContent = 
                    `${file}の${rank}の${pieceName}を選択しました。移動先を選んでください`;
            } else {
                // 移動先を選択
                const toRank = rank;
                const toFile = file;
                const fromRank = parseInt(fromCell.dataset.rank);
                const fromFile = parseInt(fromCell.dataset.file);
                
                if (fromRank === toRank && fromFile === toFile) {
                    // 同じマスをクリックした場合はキャンセル
                    fromCell.removeAttribute('data-selected');
                    fromCell = null;
                    document.getElementById('game-announcements').textContent = '選択をキャンセルしました';
                } else {
                    // 移動先に自分の駒がある場合は、選択を切り替え
                    if (piece && piece.color === humanColor) {
                        fromCell.removeAttribute('data-selected');
                        fromCell = cell;
                        cell.setAttribute('data-selected', 'true');
                        const pieceName = {
                            'fu': '歩', 'kyosha': '香', 'keima': '桂', 'gin': '銀',
                            'kin': '金', 'kaku': '角', 'hisha': '飛', 'gyoku': '玉', 'ou': '王',
                            'tokin': 'と金', 'nkyosha': '成香', 'nkeima': '成桂', 'ngin': '成銀',
                            'uma': '馬', 'ryu': '龍'
                        }[piece.type] || piece.type;
                        document.getElementById('game-announcements').textContent = 
                            `${file}の${rank}の${pieceName}に選択を切り替えました。移動先を選んでください`;
                    } else {
                        // 駒を移動
                        makeMove(fromFile, fromRank, toFile, toRank);
                        fromCell.removeAttribute('data-selected');
                        fromCell = null;
                    }
                }
            }
        }
        
        function makeMove(fromFile, fromRank, toFile, toRank) {
            if (isGameOver()) {
                document.getElementById('game-announcements').textContent = 'ゲームは終了しています';
                return;
            }
            console.log('[makeMove] Starting move:', { fromFile, fromRank, toFile, toRank });
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            fetchJson(`/game/{{ $game->id }}/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                body: JSON.stringify({
                    from_file: fromFile,
                    from_rank: fromRank,
                    to_file: toFile,
                    to_rank: toRank
                })
            })
            .then(data => {
                console.log('[makeMove] API response:', data.success, 'boardState available:', !!data.boardState);
                if (data.success) {
                    window.lastMoveTarget = { rank: toRank, file: toFile };
                    if (data.promotionTarget) {
                        window.promotionTarget = data.promotionTarget;
                    }
                    document.getElementById('game-announcements').textContent = 
                        `${fromFile}の${fromRank}から${toFile}の${toRank}に移動しました`;
                    
                    // ボード更新
                    console.log('[makeMove] Calling updateBoard with:', data.boardState);
                    updateBoard(data.boardState);
                    updateGameInfo(data);
                    
                    // AIが指し手を返した場合
                    if (data.aiMove) {
                        setTimeout(() => {
                            document.getElementById('game-announcements').textContent = 
                                `AIが${data.aiMove.from_file}の${data.aiMove.from_rank}から${data.aiMove.to_file}の${data.aiMove.to_rank}に移動しました`;
                        }, 500);
                    }
                } else {
                    console.warn('[makeMove] Move failed:', data.message);
                    document.getElementById('game-announcements').textContent = 
                        `移動できません: ${data.message || 'エラーが発生しました'}`;
                }
            })
            .catch(error => {
                console.warn('[makeMove] Error:', error);
                document.getElementById('game-announcements').textContent = 'エラーが発生しました';
            });
        };

        function makeDrop(pieceType, toFile, toRank) {
            if (isGameOver()) {
                document.getElementById('game-announcements').textContent = 'ゲームは終了しています';
                return;
            }
            console.log('[makeDrop] Starting drop:', {pieceType, toFile, toRank});
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            const payload = {
                is_drop: true,
                piece_type: pieceType,
                to_file: toFile,
                to_rank: toRank
            };
            console.log('[makeDrop] Payload:', payload);

            fetchJson(`/game/{{ $game->id }}/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                body: JSON.stringify(payload)
            })
            .then(data => {
                console.log('[makeDrop] Response:', data);
                if (data.success) {
                    console.log('[makeDrop] Drop succeeded, updating board');
                    document.getElementById('game-announcements').textContent = 
                        `${toFile}の${toRank}に持ち駒を打ちました`;
                    updateBoard(data.boardState);
                    updateGameInfo(data);
                } else {
                    console.warn('[makeDrop] Drop failed:', data.message);
                    document.getElementById('game-announcements').textContent = 
                        `打てません: ${data.message || 'エラーが発生しました'}`;
                }
            })
            .catch(error => {
                console.warn('[makeDrop] Fetch error:', error);
                document.getElementById('game-announcements').textContent = 'エラーが発生しました';
            });
        }
        
        function updateBoard(boardState) {
            if (!boardState || !boardState.board) return;
            
            // デバッグログ
            console.log('[updateBoard] Called with boardState:', boardState);
            console.log('[updateBoard] Board keys:', Object.keys(boardState.board).slice(0, 3));
            
            // グローバル状態を更新
            window.gameData.boardState = boardState;

            const cells = document.querySelectorAll('.cell');
            let updateCount = 0;
            cells.forEach(cell => {
                const rank = parseInt(cell.dataset.rank);
                const file = parseInt(cell.dataset.file);
                const piece = boardState.board[rank]?.[file];
                
                const pieceNameMap = {
                    'fu': '歩',
                    'kyosha': '香',
                    'keima': '桂',
                    'gin': '銀',
                    'kin': '金',
                    'kaku': '角',
                    'hisha': '飛',
                    'gyoku': '玉',
                    'ou': '王',
                    'tokin': 'と金',
                    'nkyosha': '成香',
                    'nkeima': '成桂',
                    'ngin': '成銀',
                    'uma': '馬',
                    'ryu': '龍',
                };
                
                // 駒の色クラスをリセット
                cell.className = 'cell';
                
                // セルの内容を完全にクリアして再構築
                cell.innerHTML = '';
                
                if (piece) {
                    const pieceName = pieceNameMap[piece.type] || piece.type;
                    const pieceTextSpan = document.createElement('span');
                    pieceTextSpan.className = 'piece-text';
                    pieceTextSpan.textContent = pieceName;
                    cell.appendChild(pieceTextSpan);
                    cell.classList.add('piece-' + piece.color);
                    
                    const colorName = piece.color === 'sente' ? '先手' : '後手';
                    cell.setAttribute('aria-label', `${file}の${rank} ${colorName}の${pieceName}`);
                } else {
                    // 空のセルにも空のspanを追加（一貫性のため）
                    const pieceTextSpan = document.createElement('span');
                    pieceTextSpan.className = 'piece-text';
                    cell.appendChild(pieceTextSpan);
                    cell.setAttribute('aria-label', `${file}の${rank} 空`);
                }
                updateCount++;
            });

            console.log('[updateBoard] Updated', updateCount, 'cells');
            updateHands(boardState.hand || { sente: {}, gote: {} });
            
            // DOM更新を強制的に反映
            void document.body.offsetHeight;
        }

        // グローバルに割り当て
        window.updateBoard = updateBoard;

        function updateHands(hand) {
            console.log('[updateHands] Updating hands with:', hand);
            const pieceNameMap = {
                'fu': '歩',
                'kyosha': '香',
                'keima': '桂',
                'gin': '銀',
                'kin': '金',
                'kaku': '角',
                'hisha': '飛',
                'tokin': 'と金',
                'nkyosha': '成香',
                'nkeima': '成桂',
                'ngin': '成銀',
                'uma': '馬',
                'ryu': '龍',
            };

            const senteHand = document.getElementById('sente-hand');
            const goteHand = document.getElementById('gote-hand');

            const renderHand = (element, color) => {
                const items = hand[color] || {};
                const entries = Object.entries(items).filter(([, count]) => count > 0);

                if (entries.length === 0) {
                    element.innerHTML = '<p style="color: var(--color-text-secondary);">持ち駒なし</p>';
                    return;
                }

                element.innerHTML = entries.map(([piece, count]) => {
                    const name = pieceNameMap[piece] || piece;
                    return `<button type="button" class="hand-piece" data-piece="${piece}" data-color="${color}">${name} × ${count}</button>`;
                }).join('');
            };

            renderHand(senteHand, 'sente');
            renderHand(goteHand, 'gote');

            document.querySelectorAll('.hand-piece').forEach(button => {
                button.addEventListener('click', handleHandPieceSelect);
            });
        }

        function handleHandPieceSelect(e) {
            if (isGameOver()) {
                document.getElementById('game-announcements').textContent = 'ゲームは終了しています';
                return;
            }
            const button = e.currentTarget;
            const pieceColor = button.dataset.color;
            const pieceType = button.dataset.piece;
            
            console.log('[handleHandPieceSelect] Selected:', {pieceColor, pieceType, currentPlayer, humanColor});

            if (currentPlayer !== 'human') {
                console.log('[handleHandPieceSelect] Not your turn');
                document.getElementById('game-announcements').textContent = 'あなたの手番ではありません';
                return;
            }

            if (pieceColor !== humanColor) {
                console.log('[handleHandPieceSelect] Not your piece color');
                document.getElementById('game-announcements').textContent = '相手の持ち駒は使えません';
                return;
            }

            if (selectedHandPiece && selectedHandPiece.type === pieceType && selectedHandPiece.color === pieceColor) {
                console.log('[handleHandPieceSelect] Deselecting same piece');
                selectedHandPiece = null;
                button.removeAttribute('data-selected');
                document.getElementById('game-announcements').textContent = '持ち駒の選択を解除しました';
                return;
            }

            document.querySelectorAll('.hand-piece[data-selected="true"]').forEach(el => {
                el.removeAttribute('data-selected');
            });

            if (fromCell) {
                fromCell.removeAttribute('data-selected');
                fromCell = null;
            }

            selectedHandPiece = { type: pieceType, color: pieceColor };
            button.setAttribute('data-selected', 'true');
            console.log('[handleHandPieceSelect] Selected hand piece:', selectedHandPiece);
            document.getElementById('game-announcements').textContent = '持ち駒を選択しました。打つ場所を選んでください。';
        }
        
        function updateGameInfo(data) {
            if (data.moveCount !== undefined) {
        document.getElementById('move-count').textContent = data.moveCount + '手';
            }
            if (data.currentPlayer !== undefined) {
                const playerText = data.currentPlayer === 'human' ? 'あなた' : 'AI';
                const colorText = data.humanColor === 'sente' ? '先手' : '後手';
                document.getElementById('current-player').textContent = `${playerText}(${colorText})`;
                currentPlayer = data.currentPlayer;
            }
            
            // ゲーム状態を更新
            if (data.status !== undefined) {
                window.gameData.status = data.status;
            }
            if (data.winner !== undefined) {
                window.gameData.winner = data.winner;
            }
            if (data.moveCount !== undefined) {
                window.gameData.moveCount = data.moveCount;
            }
            
            // ゲーム終了時のランキング登録ダイアログを表示
            if (data.status && data.status !== 'in_progress') {
                console.log('[updateGameInfo] Game finished! Showing dialog');
                // 少し遅延させてダイアログを表示（アニメーションのため）
                setTimeout(() => {
                    showRankingRegistrationDialog();
                }, 500);
            }
            
            // 成り可能かチェック（ゲーム終了時は表示しない）
            if (data.canPromote && !isGameOver()) {
                showPromotionDialog(data.piece, data.boardState);
            }
        }
        
        // 成りダイアログを表示（テストからもアクセス可能にグローバル公開）
        window.showPromotionDialog = function showPromotionDialog(piece, boardState) {
            const pieceName = {
                'fu': '歩', 'kyosha': '香', 'keima': '桂', 'gin': '銀',
                'kaku': '角', 'hisha': '飛'
            }[piece.type] || piece.type;
            
            const promotedName = {
                'fu': 'と金', 'kyosha': '成香', 'keima': '成桂', 'gin': '成銀',
                'kaku': '馬', 'hisha': '龍'
            }[piece.type] || piece.type;
            
            const dialog = document.createElement('div');
            dialog.id = 'promotion-dialog';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-labelledby', 'promotion-dialog-title');
            dialog.innerHTML = `
                <div class="promotion-modal">
                    <div class="promotion-content">
                        <h3 id="promotion-dialog-title">${pieceName}が敵陣に到達しました</h3>
                        <p id="promotion-dialog-desc">成りますか？${promotedName}に成るか、${pieceName}のままにするか選択してください。</p>
                        <div class="promotion-options" role="group" aria-label="成り選択">
                            <button id="btn-promote-yes" class="btn-promote" aria-describedby="promotion-dialog-desc">
                                成る (${promotedName})
                            </button>
                            <button id="btn-promote-no" class="btn-promote" aria-describedby="promotion-dialog-desc">
                                成らない (${pieceName}のまま)
                            </button>
                        </div>
                    </div>
                </div>
            `;
            dialog.setAttribute('aria-describedby', 'promotion-dialog-desc');
            
            document.body.appendChild(dialog);
            
            // スタイルを追加
            const style = document.createElement('style');
            style.textContent = `
                #promotion-dialog {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .promotion-modal {
                    background: var(--color-bg, #FFF);
                    border: 4px solid var(--color-border, #333);
                    border-radius: 8px;
                    padding: 24px;
                    min-width: 300px;
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
                    color: var(--color-text, #1A1A1A);
                }
                
                .promotion-content h3 {
                    margin: 0 0 12px 0;
                    font-size: 18px;
                    color: var(--color-text, #1A1A1A);
                }
                
                .promotion-content p {
                    margin: 0 0 20px 0;
                    color: var(--color-text-secondary);
                }
                
                .promotion-options {
                    display: flex;
                    gap: 12px;
                }
                
                .btn-promote {
                    flex: 1;
                    padding: 12px 16px;
                    font-size: 14px;
                    font-weight: bold;
                    border: 2px solid var(--color-border, #333);
                    background: var(--color-surface, #E6F3FF);
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s, box-shadow 0.2s;
                    color: var(--color-text, #1A1A1A);
                }
                
                .btn-promote:hover, .btn-promote:focus {
                    background: var(--color-bg, #D0E8FF);
                    outline: 4px solid var(--color-focus, #FFD700);
                    outline-offset: 2px;
                }
            `;
            document.head.appendChild(style);
            
            // ボタンのイベントハンドラ
            document.getElementById('btn-promote-yes')?.addEventListener('click', function() {
                handlePromotion(true);
                dialog.remove();
            });
            
            document.getElementById('btn-promote-no')?.addEventListener('click', function() {
                handlePromotion(false);
                dialog.remove();
            });

            // フォーカストラップとキーボードサポート
            const focusableButtons = dialog.querySelectorAll('button');
            dialog.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    // Escape で「成らない」を選択
                    e.preventDefault();
                    handlePromotion(false);
                    dialog.remove();
                    return;
                }
                if (e.key === 'Tab') {
                    // ダイアログ内でフォーカスをトラップ
                    const first = focusableButtons[0];
                    const last = focusableButtons[focusableButtons.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            });

            // 「成る」ボタンにフォーカスを移動
            setTimeout(() => {
                const promoteYes = document.getElementById('btn-promote-yes');
                if (promoteYes) promoteYes.focus();
                document.getElementById('game-announcements').textContent = 
                    `${pieceName}を${promotedName}に成るかどうかを選択してください`;
            }, 100);
        }
        
        // 成りを確定
        function handlePromotion(promote) {
            const target = window.promotionTarget || window.lastMoveTarget;
            if (!target) {
                document.getElementById('game-announcements').textContent = '成り対象の駒が特定できませんでした';
                return;
            }

            fetchJson(`/game/{{ $game->id }}/promote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({
                    rank: target.rank,
                    file: target.file,
                    promote: !!promote,
                }),
            })
            .then(data => {
                if (data.success) {
                    if (data.boardState) {
                        updateBoard(data.boardState);
                    }
                    
                    // ゲーム情報を更新（currentPlayer, moveCount, status等）
                    updateGameInfo(data);
                    
                    document.getElementById('game-announcements').textContent = data.message || '成りを確定しました';
                    
                    // AIが指し手を返した場合のアナウンス
                    if (data.aiMove) {
                        setTimeout(() => {
                            document.getElementById('game-announcements').textContent = 
                                `AIが${data.aiMove.from_file}の${data.aiMove.from_rank}から${data.aiMove.to_file}の${data.aiMove.to_rank}に移動しました`;
                        }, 500);
                    }
                } else {
                    document.getElementById('game-announcements').textContent = data.message || '成りの確定に失敗しました';
                }
            })
            .catch(error => {
                console.warn('Error:', error);
                document.getElementById('game-announcements').textContent = '成りの確定に失敗しました';
            });
        }
        
        // 操作ボタン
        document.getElementById('btn-undo')?.addEventListener('click', function() {
            handleUndo();
        });
        
        document.getElementById('btn-resign')?.addEventListener('click', function() {
            if (confirm('投了しますか？')) {
                fetchJson(`/game/{{ $game->id }}/resign`, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'Content-Type': 'application/json',
                    },
                })
                .then(data => {
                    if (data.success) {
                        document.getElementById('game-announcements').textContent = '投了しました';
                        location.reload();
                    } else {
                        alert(data.message || '投了処理に失敗しました');
                    }
                })
                .catch(error => {
                    console.warn('Error:', error);
                    alert('エラーが発生しました');
                });
            }
        });
        
        document.getElementById('btn-reset')?.addEventListener('click', function() {
              handleReset();
        });
        
        document.getElementById('btn-quit')?.addEventListener('click', function() {
            if (confirm('ゲームをやめてホームに戻りますか？')) {
                window.location.href = '/';
            }
        });
        
        // ゲーム終了時のランキング登録ダイアログ処理
        const rankingDialog = document.getElementById('ranking-registration-dialog');
        if (rankingDialog) {
            // 登録ボタンのクリックハンドラ
            document.getElementById('btn-register-ranking')?.addEventListener('click', function() {
                const nickname = document.getElementById('ranking-nickname-input').value.trim();
                
                if (!nickname) {
                    alert('ニックネームを入力してください');
                    return;
                }
                
                if (nickname.length < 3 || nickname.length > 15) {
                    alert('ニックネームは3〜15文字で入力してください');
                    return;
                }
                
                // ランキングに登録
                fetch('/ranking/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({
                        game_session_id: window.gameSessionId,
                        nickname: nickname
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const rank = data.data?.rank || '';
                        const message = rank ? `${rank}位に登録されました！` : 'ランキングに登録されました！';
                        
                        // aria-live領域に通知
                        const announcements = document.getElementById('game-announcements');
                        announcements.textContent = message;
                        
                        // ダイアログを閉じる
                        rankingDialog.style.display = 'none';
                        
                        // ランキングページへのリンクを表示
                        const infoPanel = document.querySelector('.info-panel');
                        if (infoPanel) {
                            const linkDiv = document.createElement('div');
                            linkDiv.style.marginTop = '24px';
                            linkDiv.style.padding = '16px';
                            linkDiv.style.background = '#E6F3FF';
                            linkDiv.style.borderRadius = '4px';
                            linkDiv.innerHTML = `
                                <p style="margin: 0 0 12px 0; font-weight: bold;">${message}</p>
                                <a href="/ranking" class="btn btn-primary" style="display: inline-block;">
                                    ランキングを見る
                                </a>
                            `;
                            infoPanel.appendChild(linkDiv);
                            
                            // ランキングリンクにフォーカスを移動（スクロールなし）
                            const rankingLink = linkDiv.querySelector('a');
                            if (rankingLink) {
                                rankingLink.focus({ preventScroll: true });
                                announcements.textContent = message + ' ランキングを見るボタンにフォーカスしました。';
                            }
                        }
                    } else {
                        alert(data.message || 'ランキング登録に失敗しました');
                        // 失敗時は入力フィールドにフォーカスを戻す
                        document.getElementById('ranking-nickname-input')?.focus();
                    }
                })
                .catch(error => {
                    console.warn('Error:', error);
                    alert('エラーが発生しました');
                    document.getElementById('ranking-nickname-input')?.focus();
                });
            });
            
            // スキップボタンのクリックハンドラ
            document.getElementById('btn-skip-ranking')?.addEventListener('click', function() {
                const isHumanWin = window.gameData?.status === 'mate' && window.gameData?.winner === 'human';
                rankingDialog.style.display = 'none';
                document.getElementById('game-announcements').textContent = isHumanWin
                    ? 'ランキング登録をスキップしました'
                    : '対局を終了しました';
                // 盤面の最初のセルにフォーカスを戻す
                const firstCell = document.querySelector('.cell');
                if (firstCell) {
                    firstCell.focus();
                }
            });
        }
        
        // ページ読み込み時にゲーム終了状態を確認
        showRankingRegistrationDialog();
    });
</script>
@endpush
