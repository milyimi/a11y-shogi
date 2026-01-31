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
        background: #F9F9F9;
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
        border: 3px solid #8B4513;
        background: #DEB887;
    }
    
    .cell {
        aspect-ratio: 1;
        border: 1px solid #8B4513;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: bold;
        background: #E6D2B5;
        cursor: pointer;
        transition: background-color 0.2s, box-shadow 0.2s;
        color: #1A1A1A;
    }
    
    .cell:hover, .cell:focus {
        background: #D4BFA3;
        outline: 4px solid #FFD700;
        outline-offset: -4px;
        box-shadow: inset 0 0 0 8px rgba(255, 215, 0, 0.3);
    }
    
    .cell[data-selected="true"] {
        background: #FFD700;
        box-shadow: inset 0 0 0 2px #FF8C00, 0 0 0 3px #FF8C00;
    }
    
    .piece-sente {
        color: #000000;
    }
    
    .piece-gote {
        color: #CC0000;
        transform: rotate(180deg);
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
        background: #FFFFFF;
        border: 2px solid #333333;
        border-radius: 4px;
        font-weight: bold;
        cursor: pointer;
        color: #1A1A1A;
        min-height: 40px;
        display: flex;
        align-items: center;
        transition: background-color 0.2s, box-shadow 0.2s;
    }
    
    .hand-piece:hover, .hand-piece:focus {
        background: #E6F3FF;
        box-shadow: inset 0 0 0 3px var(--color-focus);
    }

    .hand-piece[data-selected="true"] {
        background: #FFD700;
        box-shadow: inset 0 0 0 2px #FF8C00, 0 0 0 3px #FF8C00;
    }
    
    .move-history {
        max-height: 300px;
        overflow-y: auto;
        background: #FFF;
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
</style>
@endpush

@section('content')
<div class="game-page">
    <h2 class="sr-only">将棋ゲーム</h2>
    
    {{-- ゲーム状態を表示 --}}
    @if($game->status === 'paused')
        <div style="background: #FFF3CD; border: 1px solid #FFC107; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0; color: #856404;"><strong>一時停止中</strong>：このゲームは一度中断されています。再開するか、ホームに戻るかを選択できます。</p>
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
                    <p style="color: #666;">持ち駒なし</p>
                @endif
            </div>
        </aside>
        
        {{-- 盤面 --}}
        <main class="board-section" aria-labelledby="board-heading">
            <h3 id="board-heading" class="sr-only">将棋盤</h3>
            
            <div role="grid" aria-label="将棋盤 9×9マス" class="shogi-board" id="shogi-board">
                @for($rank = 9; $rank >= 1; $rank--)
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
                            data-rank="{{ $rank }}"
                            data-file="{{ $file }}"
                            aria-label="{{ $ariaLabel }}"
                            tabindex="{{ ($rank === 9 && $file === 9) ? 0 : -1 }}"
                        >
                            {{ $pieceText }}
                        </button>
                    @endfor
                @endfor
            </div>
        </main>
        
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
                        <p style="color: #666;">まだ指し手がありません</p>
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
                    <p style="color: #666;">持ち駒なし</p>
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

    
    // フォーカス管理
    let focusedCell = { rank: 9, file: 9 };
    let selectedCell = null;
    
    function updateFocus() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const rank = parseInt(cell.dataset.rank);
            const file = parseInt(cell.dataset.file);
            
            if (rank === focusedCell.rank && file === focusedCell.file) {
                cell.tabIndex = 0;
                cell.focus();
            } else {
                cell.tabIndex = -1;
            }
        });
    }
</script>
@endsection

@push('scripts')
<script>
    // キーボード操作対応
    document.addEventListener('DOMContentLoaded', function() {
        const cells = document.querySelectorAll('.cell');
        const handPieces = document.querySelectorAll('.hand-piece');
        const humanColor = @json($game->human_color);
        let currentPlayer = window.gameData.currentPlayer || 'human';
        
        // === デバッグ：currentPlayer を強制的に human に設定 ===
        console.log('[Init] 初期 currentPlayer:', currentPlayer);
        currentPlayer = 'human';
        console.log('[Init] 修正後 currentPlayer:', currentPlayer, 'humanColor:', humanColor);
        
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
                    console.error('Error:', error);
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
                    console.error('Error:', error);
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
                        window.focusedCell = { rank: newRank, file: newFile };
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
                fromCell = cell;
                cell.setAttribute('data-selected', 'true');
                document.getElementById('game-announcements').textContent = 
                    `${file}の${rank}から移動を開始します`;
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
                    // 駒を移動
                    makeMove(fromFile, fromRank, toFile, toRank);
                    fromCell.removeAttribute('data-selected');
                    fromCell = null;
                }
            }
        }
        
        function makeMove(fromFile, fromRank, toFile, toRank) {
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
                if (data.success) {
                    window.lastMoveTarget = { rank: toRank, file: toFile };
                    if (data.promotionTarget) {
                        window.promotionTarget = data.promotionTarget;
                    }
                    document.getElementById('game-announcements').textContent = 
                        `${fromFile}の${fromRank}から${toFile}の${toRank}に移動しました`;
                    
                    // ボード更新
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
                    document.getElementById('game-announcements').textContent = 
                        `移動できません: ${data.message || 'エラーが発生しました'}`;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('game-announcements').textContent = 'エラーが発生しました';
            });
        }

        function makeDrop(pieceType, toFile, toRank) {
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
                    console.error('[makeDrop] Drop failed:', data.message);
                    document.getElementById('game-announcements').textContent = 
                        `打てません: ${data.message || 'エラーが発生しました'}`;
                }
            })
            .catch(error => {
                console.error('[makeDrop] Fetch error:', error);
                document.getElementById('game-announcements').textContent = 'エラーが発生しました';
            });
        }
        
        function updateBoard(boardState) {
            if (!boardState || !boardState.board) return;
            
            const cells = document.querySelectorAll('.cell');
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
                cell.textContent = '';
                
                if (piece) {
                    const pieceName = pieceNameMap[piece.type] || piece.type;
                    cell.textContent = pieceName;
                    cell.classList.add('piece-' + piece.color);
                    
                    const colorName = piece.color === 'sente' ? '先手' : '後手';
                    cell.setAttribute('aria-label', `${file}の${rank} ${colorName}の${pieceName}`);
                } else {
                    cell.setAttribute('aria-label', `${file}の${rank} 空`);
                }
            });

            updateHands(boardState.hand || { sente: {}, gote: {} });
        }

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
                    element.innerHTML = '<p style="color: #666;">持ち駒なし</p>';
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
            
            // 成り可能かチェック
            if (data.canPromote) {
                showPromotionDialog(data.piece, data.boardState);
            }
        }
        
        // 成りダイアログを表示
        function showPromotionDialog(piece, boardState) {
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
            dialog.innerHTML = `
                <div class="promotion-modal">
                    <div class="promotion-content">
                        <h3>${pieceName}が敵陣に到達しました</h3>
                        <p>成りますか？</p>
                        <div class="promotion-options">
                            <button id="btn-promote-yes" class="btn-promote">
                                成る (${promotedName})
                            </button>
                            <button id="btn-promote-no" class="btn-promote">
                                成らない
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
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
                    background: #FFF;
                    border: 4px solid #333;
                    border-radius: 8px;
                    padding: 24px;
                    min-width: 300px;
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
                }
                
                .promotion-content h3 {
                    margin: 0 0 12px 0;
                    font-size: 18px;
                    color: #1A1A1A;
                }
                
                .promotion-content p {
                    margin: 0 0 20px 0;
                    color: #666;
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
                    border: 2px solid #333;
                    background: #E6F3FF;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s, box-shadow 0.2s;
                    color: #1A1A1A;
                }
                
                .btn-promote:hover, .btn-promote:focus {
                    background: #D0E8FF;
                    outline: 4px solid #FFD700;
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
                    document.getElementById('game-announcements').textContent = data.message || '成りを確定しました';
                } else {
                    document.getElementById('game-announcements').textContent = data.message || '成りの確定に失敗しました';
                }
            })
            .catch(error => {
                console.error('Error:', error);
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
                    console.error('Error:', error);
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
    });
</script>
@endpush
