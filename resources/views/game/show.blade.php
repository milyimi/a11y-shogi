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
        background: var(--color-surface);
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
        min-width: calc(48px * 9);
    }

    .shogi-board > [role="row"] {
        display: contents;
    }
    
    .cell {
        aspect-ratio: 1;
        min-width: 48px;
        min-height: 48px;
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
        position: relative;
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

    .cell[data-ai-last-move="true"] {
        background: #FFE0B2;
        box-shadow: inset 0 0 0 3px #E65100, 0 0 0 3px #E65100;
    }
    .cell[data-ai-last-move="true"]::after {
        content: "★";
        position: absolute;
        top: 0;
        right: 1px;
        font-size: 10px;
        color: #E65100;
        line-height: 1;
        pointer-events: none;
    }

    .cell[data-legal-move="true"] {
        background: rgba(76, 175, 80, 0.3);
    }
    .cell[data-legal-move="true"]::before {
        content: "●";
        position: absolute;
        font-size: 12px;
        color: rgba(76, 175, 80, 0.7);
        pointer-events: none;
    }
    
    .piece-sente {
        color: #000000;
    }
    
    .piece-gote {
        color: var(--color-gote, #CC0000);
        transform: rotate(180deg);
        text-decoration: underline;
        text-decoration-thickness: 2px;
        text-underline-offset: 2px;
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
    html.high-contrast .cell[data-ai-last-move="true"] {
        background: #8B4513;
        box-shadow: inset 0 0 0 3px #FF6600, 0 0 0 3px #FF6600;
    }
    html.high-contrast .cell[data-ai-last-move="true"]::after {
        color: #FF6600;
    }
    html.high-contrast .cell[data-legal-move="true"] {
        background: #2E5930;
    }
    html.high-contrast .cell[data-legal-move="true"]::before {
        color: #66BB6A;
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

    /* Windows強制カラーモード（Shift+Alt+PrintScreen）対応 */
    @media (forced-colors: active) {
        .cell {
            border: 1px solid ButtonText;
            forced-color-adjust: none;
            background: Canvas;
            color: CanvasText;
        }
        .cell:hover, .cell:focus {
            outline: 4px solid Highlight;
            outline-offset: -4px;
            background: Canvas;
        }
        .cell[data-selected="true"] {
            outline: 4px solid Highlight;
            outline-offset: -4px;
            background: Highlight;
            color: HighlightText;
        }
        .cell[data-ai-last-move="true"] {
            outline: 4px dashed LinkText;
            outline-offset: -4px;
            border: 3px solid LinkText;
            background: Mark;
            color: MarkText;
        }
        .cell[data-ai-last-move="true"]::after {
            content: "★";
            position: absolute;
            top: 0;
            right: 1px;
            font-size: 10px;
            color: LinkText;
            line-height: 1;
        }
        .piece-sente {
            color: CanvasText;
        }
        .piece-gote {
            color: CanvasText;
        }
        .hand-piece {
            forced-color-adjust: none;
            background: Canvas;
            color: CanvasText;
            border: 2px solid ButtonText;
        }
        .hand-piece:hover, .hand-piece:focus {
            outline: 3px solid Highlight;
            outline-offset: -3px;
        }
        .hand-piece[data-selected="true"] {
            outline: 3px solid Highlight;
            outline-offset: -3px;
            background: Highlight;
            color: HighlightText;
        }
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
    
    {{-- 盤面へのスキップリンク --}}
    <a href="#shogi-board" class="skip-link">盤面へスキップ</a>
    
    <div class="game-container">
        {{-- 駒台（後手） --}}
        <aside class="komadai" aria-labelledby="gote-komadai-heading">
            <h3 id="gote-komadai-heading">後手の駒台</h3>
            <div class="hand-pieces" id="gote-hand" aria-label="後手の持ち駒" aria-live="polite" aria-relevant="additions removals">
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
                        @if($count > 0)
                        <button type="button" class="hand-piece" data-piece="{{ $piece }}" data-color="gote"
                                aria-label="後手の持ち駒 {{ $pieceNameMap[$piece] ?? $piece }} {{ $count }}枚">
                            {{ $pieceNameMap[$piece] ?? $piece }} × {{ $count }}
                        </button>
                        @endif
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
                        ><span class="piece-text" aria-hidden="true">{{ $pieceText }}</span></button>
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
                <dl style="line-height: 2;">
                    <div style="margin-bottom: 8px;">
                        <dt style="font-weight: bold; display: inline;">難易度:</dt>
                        <dd style="display: inline; margin-left: 8px;">{{ $game->difficulty === 'easy' ? '初級' : ($game->difficulty === 'medium' ? '中級' : '上級') }}</dd>
                    </div>
                    
                    <div style="margin-bottom: 8px;">
                        <dt style="font-weight: bold; display: inline;">現在の手番:</dt>
                        <dd style="display: inline; margin-left: 8px;" id="current-player">
                            {{ $gameState['currentPlayer'] === 'human' ? 'あなた' : 'AI' }}
                            ({{ $game->human_color === 'sente' ? '先手' : '後手' }})
                        </dd>
                    </div>
                    
                    <div style="margin-bottom: 8px;">
                        <dt style="font-weight: bold; display: inline;">手数:</dt>
                        <dd style="display: inline; margin-left: 8px;" id="move-count">{{ $gameState['moveCount'] }}手</dd>
                    </div>
                    
                    <div>
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
                    <button type="button" class="btn" id="btn-undo" {{ ($gameState['moveCount'] ?? 0) > 0 && ($gameState['status'] === 'in_progress') ? '' : 'disabled' }}>
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
            
            <section aria-labelledby="shortcuts-heading" style="margin-top: 24px;">
                <h3 id="shortcuts-heading">ショートカット</h3>
                <dl style="line-height: 1.8; font-size: 0.85rem; color: var(--color-text-secondary);">
                    <dt style="font-weight: bold; display: inline;">移動:</dt>
                    <dd style="display: inline; margin-left: 4px;">矢印 / WASD</dd><br>
                    <dt style="font-weight: bold; display: inline;">情報:</dt>
                    <dd style="display: inline; margin-left: 4px;">B=盤面 S=状態 K=棋譜</dd><br>
                    <dt style="font-weight: bold; display: inline;">駒台:</dt>
                    <dd style="display: inline; margin-left: 4px;">Shift+T/G</dd><br>
                    <dt style="font-weight: bold; display: inline;">他:</dt>
                    <dd style="display: inline; margin-left: 4px;">H=ヘルプ U=待った R=リセット</dd>
                </dl>
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
            <div class="hand-pieces" id="sente-hand" aria-label="先手の持ち駒" aria-live="polite" aria-relevant="additions removals">
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
                        @if($count > 0)
                        <button type="button" class="hand-piece" data-piece="{{ $piece }}" data-color="sente"
                                aria-label="先手の持ち駒 {{ $pieceNameMap[$piece] ?? $piece }} {{ $count }}枚">
                            {{ $pieceNameMap[$piece] ?? $piece }} × {{ $count }}
                        </button>
                        @endif
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
        
        // 初回ガイダンスをアナウンス（ゲーム開始時に1回だけ）
        setTimeout(function() {
            var guide = '対局を開始しました。';
            if (currentPlayer === 'human') {
                guide += 'あなたの手番です。';
            } else {
                guide += 'AIが先に指します。';
            }
            guide += '矢印キーで盤面を移動、Enterで駒を選択・移動します。';
            guide += 'Bキーで盤面全体の読み上げ、Kキーで棋譜の読み上げ、Hキーでヘルプページを開きます。';
            guide += '持ち駒を打つにはShift+Tで先手駒台、Shift+Gで後手駒台へ移動できます。';
            document.getElementById('game-announcements').textContent = guide;
        }, 500);
        
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
                case 'K':
                    // 棋譜（手順）を読み上げ
                    e.preventDefault();
                    announceMoveHistory();
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
                    // Shift+T: 先手駒台へフォーカス移動
                    if (e.shiftKey) {
                        e.preventDefault();
                        focusHandPieces('sente');
                    }
                    break;
                case 'G':
                    // Shift+G: 後手駒台へフォーカス移動
                    if (e.shiftKey) {
                        e.preventDefault();
                        focusHandPieces('gote');
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
            const currentPlayer = document.getElementById('current-player').textContent;
            const moveCount = document.getElementById('move-count').textContent;
            const elapsedTime = document.getElementById('elapsed-time').textContent;
            let announcement = `現在の手番: ${currentPlayer}。手数: ${moveCount}。経過時間: ${elapsedTime}。`;
            if (isGameOver()) {
                const winner = window.gameData.winner;
                announcement = winner === 'human' ? '対局終了: あなたの勝ちです。' : '対局終了: AIの勝ちです。';
                announcement += `手数: ${moveCount}。経過時間: ${elapsedTime}。`;
            }
            document.getElementById('game-announcements').textContent = announcement;
        }

        // 棋譜（手順）を読み上げ
        function announceMoveHistory() {
            const container = document.getElementById('move-history');
            if (!container) return;
            const items = container.querySelectorAll('li');
            if (items.length === 0) {
                document.getElementById('game-announcements').textContent = 'まだ指し手がありません';
                return;
            }
            let announcement = `棋譜: 全${items.length}手。`;
            // 直近5手を読み上げ（全部だと長すぎる）
            const start = Math.max(0, items.length - 5);
            if (start > 0) {
                announcement += `直近5手: `;
            }
            for (let i = start; i < items.length; i++) {
                announcement += `${i + 1}手目 ${items[i].textContent}。`;
            }
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

            // CSRFトークン期限切れ / セッション切れ
            if (response.status === 419) {
                showSessionExpiredDialog();
                return { success: false, message: 'セッションの有効期限が切れました。ページを再読み込みしてください。', sessionExpired: true };
            }

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

        function showSessionExpiredDialog() {
            // まずスクリーンリーダーに即時通知
            document.getElementById('game-announcements').textContent =
                'セッションの有効期限が切れました。ページを再読み込みしてください。';

            // ダイアログ表示（再読み込みを促す）
            const overlay = document.createElement('div');
            overlay.id = 'session-expired-overlay';
            overlay.setAttribute('role', 'alertdialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'session-expired-title');
            overlay.setAttribute('aria-describedby', 'session-expired-desc');
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:3000;';
            overlay.innerHTML = `
                <div style="background:var(--color-bg,#fff);border:4px solid var(--color-border,#333);border-radius:8px;padding:32px;max-width:400px;box-shadow:0 8px 24px rgba(0,0,0,0.3);color:var(--color-text,#1A1A1A);">
                    <h3 id="session-expired-title" style="margin:0 0 12px 0;">セッションの有効期限が切れました</h3>
                    <p id="session-expired-desc" style="margin:0 0 24px 0;color:var(--color-text-secondary);">長時間操作がなかったため、セッションが切れました。ページを再読み込みして続行してください。</p>
                    <button id="session-expired-reload" class="btn btn-primary" style="width:100%;padding:12px;font-size:1rem;cursor:pointer;">ページを再読み込み</button>
                </div>
            `;
            document.body.appendChild(overlay);

            const reloadBtn = document.getElementById('session-expired-reload');
            reloadBtn.addEventListener('click', () => location.reload());

            // フォーカストラップ（ボタン1つのみ）
            overlay.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    location.reload();
                }
                if (e.key === 'Tab') {
                    e.preventDefault();
                    reloadBtn.focus();
                }
            });

            setTimeout(() => reloadBtn.focus(), 50);
        }

        function isGameOver() {
            return window.gameData && window.gameData.status && window.gameData.status !== 'in_progress';
        }

        // 待った（undo）
        function handleUndo() {
            showConfirmDialog('一手前に戻しますか？', '直前の指し手を取り消します。', function() {
                fetchJson(`/game/{{ $game->id }}/undo`, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'Content-Type': 'application/json',
                    },
                })
                .then(data => {
                    if (data.success) {
                        sessionStorage.setItem('a11y-shogi-announce', '一手前に戻しました');
                        location.reload();
                    } else {
                        document.getElementById('game-announcements').textContent = data.message || '待った処理に失敗しました';
                    }
                })
                .catch(error => {
                    console.warn('Error:', error);
                    document.getElementById('game-announcements').textContent = 'エラーが発生しました';
                });
            });
        }
        
        // リセット
        function handleReset() {
            showConfirmDialog('ゲームをリセットしますか？', '初期状態に戻ります。この操作は取り消せません。', function() {
                fetchJson(`/game/{{ $game->id }}/reset`, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'Content-Type': 'application/json',
                    },
                })
                .then(data => {
                    if (data.success) {
                        // URLにパラメータを付けてリロードし、リロード後にアナウンス
                        sessionStorage.setItem('a11y-shogi-announce', 'ゲームをリセットしました');
                        location.reload();
                    } else {
                        document.getElementById('game-announcements').textContent = data.message || 'リセット処理に失敗しました';
                    }
                })
                .catch(error => {
                    console.warn('Error:', error);
                    document.getElementById('game-announcements').textContent = 'エラーが発生しました';
                });
            });
        }
        
        // 駒台へフォーカス移動
        function focusHandPieces(color) {
            const handId = color === 'sente' ? 'sente-hand' : 'gote-hand';
            const hand = document.getElementById(handId);
            if (!hand) return;

            const buttons = hand.querySelectorAll('button.hand-piece');
            if (buttons.length === 0) {
                document.getElementById('game-announcements').textContent = '持ち駒がありません。Escapeで盤面に戻れます';
                return;
            }
            // 概要を構築（例: 「歩×2, 角×1」）
            const summary = Array.from(buttons).map(btn => {
                const label = btn.getAttribute('aria-label') || btn.textContent.trim();
                return label;
            }).join('、');
            const colorName = color === 'sente' ? '先手' : '後手';
            buttons[0].focus({ preventScroll: true });
            document.getElementById('game-announcements').textContent = `${colorName}の駒台: ${summary}。矢印キーで選択、Enterで決定、Escapeで盤面に戻れます`;
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
                    case 'w':
                    case 'W':
                        if (rank < 9) newRank++;
                        handled = true;
                        break;
                    case 'ArrowDown':
                    case 's':
                        if (rank > 1) newRank--;
                        handled = true;
                        break;
                    case 'ArrowLeft':
                    case 'a':
                    case 'A':
                        if (file < 9) newFile++;
                        handled = true;
                        break;
                    case 'ArrowRight':
                    case 'd':
                    case 'D':
                        if (file > 1) newFile--;
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
                            clearLegalMoves();
                            document.getElementById('game-announcements').textContent = '選択をキャンセルしました';
                            handled = true;
                        }
                        break;
                }
                
                if (handled) {
                    e.preventDefault();
                    e.stopPropagation();
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
            button.addEventListener('keydown', handleHandPieceKeydown);
        });
        
        function handleHandPieceKeydown(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                focusCell(window.focusedCell.rank, window.focusedCell.file);
                document.getElementById('game-announcements').textContent = '盤面に戻りました';
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                const next = e.currentTarget.nextElementSibling;
                if (next && next.classList.contains('hand-piece')) next.focus();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = e.currentTarget.previousElementSibling;
                if (prev && prev.classList.contains('hand-piece')) prev.focus();
            }
        }

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
                // 合法手ハイライト表示
                showLegalMoves(piece, file, rank);
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
                    clearLegalMoves();
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
                        // 切り替え先の合法手ハイライト更新
                        showLegalMoves(piece, file, rank);
                        document.getElementById('game-announcements').textContent = 
                            `${file}の${rank}の${pieceName}に選択を切り替えました。移動先を選んでください`;
                    } else {
                        // 駒を移動
                        clearLegalMoves();
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
                    
                    // アナウンス構築（取り駒・王手・詰み・手番含む）
                    let announcement = buildMoveAnnouncement(
                        fromFile, fromRank, toFile, toRank,
                        data.capturedPiece, data.isCheck, data.status, data.winner
                    );
                    document.getElementById('game-announcements').textContent = announcement;
                    
                    // ボード更新
                    console.log('[makeMove] Calling updateBoard with:', data.boardState);
                    updateBoard(data.boardState);
                    updateGameInfo(data);
                    
                    // 移動先セルにフォーカスを移動
                    if (!data.canPromote) {
                        focusCell(toRank, toFile);
                    }
                    
                    // AIが指し手を返した場合
                    if (data.aiMove) {
                        setTimeout(() => {
                            let aiAnnouncement = buildAIMoveAnnouncement(data);
                            document.getElementById('game-announcements').textContent = aiAnnouncement;
                            highlightAIMove(data.aiMove.to_rank, data.aiMove.to_file);
                        }, 500);
                    } else if (data.status === 'in_progress') {
                        // AIの手がないかつゲーム続行中
                        // （手番変更は上の announcement に含めない）
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
                    let dropMsg = `${toFile}の${toRank}に持ち駒を打ちました`;
                    if (data.isCheck) dropMsg += '。王手です';
                    if (data.status === 'mate') {
                        dropMsg += data.winner === 'human' ? '。詰みです！あなたの勝ちです。リセットで新しい対局、ホームに戻るで終了できます' : '。詰みです。AIの勝ちです。リセットで再挑戦、ホームに戻るで終了できます';
                    }
                    document.getElementById('game-announcements').textContent = dropMsg;
                    updateBoard(data.boardState);
                    updateGameInfo(data);
                    focusCell(toRank, toFile);
                    
                    // AIが指し手を返した場合
                    if (data.aiMove) {
                        setTimeout(() => {
                            let aiAnnouncement = buildAIMoveAnnouncement(data);
                            document.getElementById('game-announcements').textContent = aiAnnouncement;
                            highlightAIMove(data.aiMove.to_rank, data.aiMove.to_file);
                        }, 500);
                    }
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
                    pieceTextSpan.setAttribute('aria-hidden', 'true');
                    pieceTextSpan.textContent = pieceName;
                    cell.appendChild(pieceTextSpan);
                    cell.classList.add('piece-' + piece.color);
                    
                    const colorName = piece.color === 'sente' ? '先手' : '後手';
                    cell.setAttribute('aria-label', `${file}の${rank} ${colorName}の${pieceName}`);
                } else {
                    // 空のセルにも空のspanを追加（一貫性のため）
                    const pieceTextSpan = document.createElement('span');
                    pieceTextSpan.className = 'piece-text';
                    pieceTextSpan.setAttribute('aria-hidden', 'true');
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
                    const colorName = color === 'sente' ? '先手' : '後手';
                    return `<button type="button" class="hand-piece" data-piece="${piece}" data-color="${color}" aria-label="${colorName}の持ち駒 ${name} ${count}枚">${name} × ${count}</button>`;
                }).join('');
            };

            renderHand(senteHand, 'sente');
            renderHand(goteHand, 'gote');

            document.querySelectorAll('.hand-piece').forEach(button => {
                button.addEventListener('click', handleHandPieceSelect);
                button.addEventListener('keydown', handleHandPieceKeydown);
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

            if (e.detail === 0) {
                focusCell(window.focusedCell.rank, window.focusedCell.file);
            }
        }
        
        // ピース名マップ（アナウンス用）
        const globalPieceNameMap = {
            'fu': '歩', 'kyosha': '香', 'keima': '桂', 'gin': '銀',
            'kin': '金', 'kaku': '角', 'hisha': '飛', 'gyoku': '玉', 'ou': '王',
            'tokin': 'と金', 'nkyosha': '成香', 'nkeima': '成桂', 'ngin': '成銀',
            'uma': '馬', 'ryu': '龍',
        };

        // 指し手アナウンス構築
        function buildMoveAnnouncement(fromFile, fromRank, toFile, toRank, capturedPiece, isCheck, status, winner) {
            let msg = `${fromFile}の${fromRank}から${toFile}の${toRank}に移動しました`;
            if (capturedPiece) {
                const capName = globalPieceNameMap[capturedPiece] || capturedPiece;
                msg += `。${capName}を取りました`;
            }
            if (status === 'mate') {
                msg += winner === 'human' ? '。詰みです！あなたの勝ちです。リセットで新しい対局、ホームに戻るで終了できます' : '。詰みです。AIの勝ちです。リセットで再挑戦、ホームに戻るで終了できます';
            } else if (isCheck) {
                msg += '。王手です';
            }
            return msg;
        }

        // AIアナウンス構築
        function buildAIMoveAnnouncement(data) {
            let msg = `AIが${data.aiMove.from_file}の${data.aiMove.from_rank}から${data.aiMove.to_file}の${data.aiMove.to_rank}に移動しました`;
            if (data.aiCapturedPiece) {
                const capName = globalPieceNameMap[data.aiCapturedPiece] || data.aiCapturedPiece;
                msg += `。${capName}を取られました`;
            }
            if (data.status === 'mate') {
                msg += data.winner === 'human' ? '。詰みです！あなたの勝ちです。リセットで新しい対局、ホームに戻るで終了できます' : '。詰みです。AIの勝ちです。リセットで再挑戦、ホームに戻るで終了できます';
            } else if (data.isCheck) {
                msg += '。王手です';
            } else {
                msg += '。あなたの番です';
            }
            return msg;
        }

        // セルへフォーカス移動
        function focusCell(rank, file) {
            window.focusedCell.rank = rank;
            window.focusedCell.file = file;
            const targetCell = document.querySelector(`.cell[data-rank="${rank}"][data-file="${file}"]`);
            if (targetCell) {
                document.querySelectorAll('.cell').forEach(c => c.tabIndex = -1);
                targetCell.tabIndex = 0;
                targetCell.focus();
            }
        }

        // AI指し手のハイライト表示
        function highlightAIMove(toRank, toFile) {
            // 前回のハイライトをクリア
            document.querySelectorAll('.cell[data-ai-last-move]').forEach(c => {
                c.removeAttribute('data-ai-last-move');
            });
            const targetCell = document.querySelector(`.cell[data-rank="${toRank}"][data-file="${toFile}"]`);
            if (targetCell) {
                targetCell.setAttribute('data-ai-last-move', 'true');
            }
        }

        // 合法手ハイライト表示
        function showLegalMoves(piece, fromFile, fromRank) {
            clearLegalMoves();
            const board = window.gameData.boardState.board;
            const moves = calcLegalMoves(piece, fromFile, fromRank, board, humanColor);
            moves.forEach(([mFile, mRank]) => {
                const cell = document.querySelector(`.cell[data-rank="${mRank}"][data-file="${mFile}"]`);
                if (cell) cell.setAttribute('data-legal-move', 'true');
            });
        }

        function clearLegalMoves() {
            document.querySelectorAll('.cell[data-legal-move]').forEach(c => {
                c.removeAttribute('data-legal-move');
            });
        }

        // クライアント側簡易合法手計算（駒の動きルールに基づく）
        function calcLegalMoves(piece, fromFile, fromRank, board, myColor) {
            const moves = [];
            const isSente = piece.color === 'sente';
            const dir = isSente ? 1 : -1; // 先手: rankが増える方向が前

            const moveDefs = {
                'fu':     [[0, dir]],
                'kyosha': Array.from({length: 8}, (_, i) => [0, dir * (i + 1)]),
                'keima':  [[-1, dir * 2], [1, dir * 2]],
                'gin':    [[-1, dir], [0, dir], [1, dir], [-1, -dir], [1, -dir]],
                'kin':    [[-1, dir], [0, dir], [1, dir], [-1, 0], [1, 0], [0, -dir]],
                'kaku':   [],
                'hisha':  [],
                'gyoku':  [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
                'ou':     [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
                'tokin':  [[-1, dir], [0, dir], [1, dir], [-1, 0], [1, 0], [0, -dir]],
                'nkyosha':[[-1, dir], [0, dir], [1, dir], [-1, 0], [1, 0], [0, -dir]],
                'nkeima': [[-1, dir], [0, dir], [1, dir], [-1, 0], [1, 0], [0, -dir]],
                'ngin':   [[-1, dir], [0, dir], [1, dir], [-1, 0], [1, 0], [0, -dir]],
                'uma':    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
                'ryu':    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
            };

            const slidePieces = {
                'kaku': [[-1,-1],[-1,1],[1,-1],[1,1]],
                'hisha': [[-1,0],[1,0],[0,-1],[0,1]],
                'kyosha': [[0, dir]],
                'uma': [[-1,-1],[-1,1],[1,-1],[1,1]],
                'ryu': [[-1,0],[1,0],[0,-1],[0,1]],
            };

            // ステップ移動
            const steps = moveDefs[piece.type] || [];
            for (const [df, dr] of steps) {
                const nf = fromFile + df;
                const nr = fromRank + dr;
                if (nf < 1 || nf > 9 || nr < 1 || nr > 9) continue;
                const target = board[nr]?.[nf];
                if (target && target.color === myColor) continue;
                moves.push([nf, nr]);
            }

            // スライド移動
            const slides = slidePieces[piece.type];
            if (slides) {
                for (const [df, dr] of slides) {
                    for (let i = 1; i <= 8; i++) {
                        const nf = fromFile + df * i;
                        const nr = fromRank + dr * i;
                        if (nf < 1 || nf > 9 || nr < 1 || nr > 9) break;
                        const target = board[nr]?.[nf];
                        if (target && target.color === myColor) break;
                        moves.push([nf, nr]);
                        if (target) break; // 相手の駒を取れるがその先には行けない
                    }
                }
            }

            return moves;
        }

        // クライアントタイマー
        let timerInterval = null;
        let timerStartedAt = Date.now();
        let timerBaseSeconds = {{ $gameState['elapsedSeconds'] }};

        function startTimer() {
            if (timerInterval) clearInterval(timerInterval);
            timerStartedAt = Date.now();
            timerInterval = setInterval(updateTimerDisplay, 1000);
        }

        function updateTimerDisplay() {
            const elapsed = timerBaseSeconds + Math.floor((Date.now() - timerStartedAt) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('elapsed-time').textContent = `${minutes}分${seconds}秒`;
        }

        // ゲーム終了時はタイマー停止
        function stopTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }

        // ゲームが進行中ならタイマー開始
        if (window.gameData.status === 'in_progress') {
            startTimer();
        }

        function updateMoveHistory(moveHistory) {
            const container = document.getElementById('move-history');
            if (!container) return;
            if (!Array.isArray(moveHistory) || moveHistory.length === 0) {
                container.innerHTML = '<p style="color: var(--color-text-secondary);">まだ指し手がありません</p>';
                return;
            }
            const ol = document.createElement('ol');
            moveHistory.forEach(move => {
                const li = document.createElement('li');
                li.textContent = move;
                ol.appendChild(li);
            });
            container.innerHTML = '';
            container.appendChild(ol);
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

            // 棋譜を更新
            if (data.moveHistory !== undefined) {
                updateMoveHistory(data.moveHistory);
            }

            // 待ったボタンの有効/無効
            const undoBtn = document.getElementById('btn-undo');
            if (undoBtn) {
                if (data.moveCount !== undefined && data.moveCount > 0 && (!data.status || data.status === 'in_progress')) {
                    undoBtn.removeAttribute('disabled');
                } else if (data.status && data.status !== 'in_progress') {
                    undoBtn.setAttribute('disabled', '');
                }
            }

            // タイマー同期
            if (data.elapsedSeconds !== undefined) {
                timerBaseSeconds = data.elapsedSeconds;
                timerStartedAt = Date.now();
                updateTimerDisplay();
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

            // ゲーム終了時
            if (data.status && data.status !== 'in_progress') {
                stopTimer();
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
                // 移動先セルにフォーカス復帰
                const target = window.promotionTarget || window.lastMoveTarget;
                if (target) focusCell(target.rank, target.file);
            });
            
            document.getElementById('btn-promote-no')?.addEventListener('click', function() {
                handlePromotion(false);
                dialog.remove();
                const target = window.promotionTarget || window.lastMoveTarget;
                if (target) focusCell(target.rank, target.file);
            });

            // フォーカストラップとキーボードサポート
            const focusableButtons = dialog.querySelectorAll('button');
            dialog.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    // Escape で「成らない」を選択
                    e.preventDefault();
                    handlePromotion(false);
                    dialog.remove();
                    const target = window.promotionTarget || window.lastMoveTarget;
                    if (target) focusCell(target.rank, target.file);
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
                            highlightAIMove(data.aiMove.to_rank, data.aiMove.to_file);
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
            showConfirmDialog('投了しますか？', '投了すると負けになります。', function() {
                fetchJson(`/game/{{ $game->id }}/resign`, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'Content-Type': 'application/json',
                    },
                })
                .then(data => {
                    if (data.success) {
                        sessionStorage.setItem('a11y-shogi-announce', '投了しました');
                        location.reload();
                    } else {
                        document.getElementById('game-announcements').textContent = data.message || '投了処理に失敗しました';
                    }
                })
                .catch(error => {
                    console.warn('Error:', error);
                    document.getElementById('game-announcements').textContent = 'エラーが発生しました';
                });
            });
        });
        
        document.getElementById('btn-reset')?.addEventListener('click', function() {
              handleReset();
        });
        
        document.getElementById('btn-quit')?.addEventListener('click', function() {
            showConfirmDialog('ゲームをやめてホームに戻りますか？', 'ゲームは一時停止されます。', function() {
                window.location.href = '/';
            });
        });
        
        // ゲーム終了時のランキング登録ダイアログ処理
        const rankingDialog = document.getElementById('ranking-registration-dialog');
        if (rankingDialog) {
            // 登録ボタンのクリックハンドラ
            document.getElementById('btn-register-ranking')?.addEventListener('click', function() {
                const nickname = document.getElementById('ranking-nickname-input').value.trim();
                
                if (!nickname) {
                    document.getElementById('game-announcements').textContent = 'ニックネームを入力してください';
                    document.getElementById('ranking-nickname-input')?.focus();
                    return;
                }
                
                if (nickname.length < 3 || nickname.length > 15) {
                    document.getElementById('game-announcements').textContent = 'ニックネームは3〜15文字で入力してください';
                    document.getElementById('ranking-nickname-input')?.focus();
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
                        document.getElementById('game-announcements').textContent = data.message || 'ランキング登録に失敗しました';
                        // 失敗時は入力フィールドにフォーカスを戻す
                        document.getElementById('ranking-nickname-input')?.focus();
                    }
                })
                .catch(error => {
                    console.warn('Error:', error);
                    document.getElementById('game-announcements').textContent = 'エラーが発生しました';
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

        // リロード後のアナウンス（sessionStorage 経由）
        const pendingAnnounce = sessionStorage.getItem('a11y-shogi-announce');
        if (pendingAnnounce) {
            sessionStorage.removeItem('a11y-shogi-announce');
            setTimeout(() => {
                document.getElementById('game-announcements').textContent = pendingAnnounce;
            }, 300);
        }
    });

    // アクセシブルな確認ダイアログ（confirm() の代替）
    function showConfirmDialog(title, description, onConfirm) {
        const overlay = document.createElement('div');
        overlay.id = 'confirm-dialog-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'confirm-dialog-title');
        overlay.setAttribute('aria-describedby', 'confirm-dialog-desc');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:3000;';
        overlay.innerHTML = `
            <div style="background:var(--color-bg,#fff);border:4px solid var(--color-border,#333);border-radius:8px;padding:32px;max-width:400px;box-shadow:0 8px 24px rgba(0,0,0,0.3);color:var(--color-text,#1A1A1A);">
                <h3 id="confirm-dialog-title" style="margin:0 0 12px 0;">${title}</h3>
                <p id="confirm-dialog-desc" style="margin:0 0 24px 0;color:var(--color-text-secondary);">${description}</p>
                <div style="display:flex;gap:12px;">
                    <button id="confirm-dialog-yes" class="btn btn-primary" style="flex:1;padding:12px;font-size:1rem;cursor:pointer;">はい</button>
                    <button id="confirm-dialog-no" class="btn" style="flex:1;padding:12px;font-size:1rem;cursor:pointer;">キャンセル</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const yesBtn = document.getElementById('confirm-dialog-yes');
        const noBtn = document.getElementById('confirm-dialog-no');

        function close() {
            overlay.remove();
        }

        yesBtn.addEventListener('click', function() {
            close();
            onConfirm();
        });

        noBtn.addEventListener('click', function() {
            close();
            document.getElementById('game-announcements').textContent = 'キャンセルしました';
        });

        overlay.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                close();
                document.getElementById('game-announcements').textContent = 'キャンセルしました';
            }
            if (e.key === 'Tab') {
                const btns = [yesBtn, noBtn];
                if (e.shiftKey && document.activeElement === btns[0]) {
                    e.preventDefault();
                    btns[1].focus();
                } else if (!e.shiftKey && document.activeElement === btns[1]) {
                    e.preventDefault();
                    btns[0].focus();
                }
            }
        });

        setTimeout(() => yesBtn.focus(), 50);
    }
</script>
@endpush
