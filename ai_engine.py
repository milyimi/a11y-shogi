#!/usr/bin/env python3
"""
python-shogiを使用した将棋AI エンジン
PHPから呼び出されてJSON形式で指し手を返す
"""

import sys
import json
import shogi
from typing import Optional

class ShogiAIEngine:
    def __init__(self, depth: int = 3):
        self.depth = depth
    
    def board_state_to_sfen(self, board_state: dict) -> str:
        """
        PHP形式の盤面をSFEN形式に変換
        board_state: {'board': {...}, 'turn': 'sente'|'gote', 'hand': {...}}
        """
        try:
            # SFEN形式を構築
            board_string = ""
            
            # 盤面部分（9段から1段まで、1筋から9筋まで）
            for rank in range(9, 0, -1):
                empty_count = 0
                for file in range(1, 10):
                    piece_data = board_state.get('board', {}).get(str(rank), {})
                    piece = piece_data.get(str(file)) if isinstance(piece_data, dict) else None
                    
                    if piece and isinstance(piece, dict):
                        if empty_count > 0:
                            board_string += str(empty_count)
                            empty_count = 0
                        
                        piece_symbol = self._convert_piece_type_to_fen(piece['type'], piece['color'])
                        board_string += piece_symbol
                    else:
                        empty_count += 1
                
                if empty_count > 0:
                    board_string += str(empty_count)
                
                if rank > 1:
                    board_string += "/"
            
            # ターン部分
            turn_symbol = "b" if board_state.get('turn') == 'sente' else "w"
            
            # 持ち駒部分（省略可能）
            hand_string = ""
            hand_data = board_state.get('hand', {})
            if hand_data:
                for color, pieces in hand_data.items():
                    # piecesが辞書の場合と配列の場合に対応
                    if isinstance(pieces, dict):
                        for piece_type, count in pieces.items():
                            if count > 0:
                                symbol = self._convert_piece_type_to_fen(piece_type, color)
                                for _ in range(count):
                                    hand_string += symbol.lower()
            
            if not hand_string:
                hand_string = "-"
            
            # 完全なSFEN（簡略版）
            sfen = f"{board_string} {turn_symbol} {hand_string} 0 0"
            return sfen
        except Exception as e:
            print(f"Error converting board: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return None
    
    def _convert_piece_type_to_fen(self, php_type: str, color: str = 'sente') -> str:
        """PHP形式の駒タイプをFEN形式に変換（大文字=先手, 小文字=後手）"""
        mapping = {
            'fu': 'P',
            'kyosha': 'L',
            'keima': 'N',
            'gin': 'S',
            'kin': 'G',
            'kaku': 'B',
            'hisha': 'R',
            'gyoku': 'K',
            'ou': 'K',
            'tokin': '+P',
            'nkyosha': '+L',
            'nkeima': '+N',
            'ngin': '+S',
            'uma': '+B',
            'ryu': '+R',
        }
        symbol = mapping.get(php_type, 'P')
        if color == 'sente':
            return symbol.upper()
        else:
            return symbol.lower()
    
    def get_best_move(self, board_state: dict) -> Optional[dict]:
        """
        与えられた盤面から最良手を探索して返す
        """
        try:
            # 基本的な盤面から python-shogi ボードを構築
            sfen = self.board_state_to_sfen(board_state)
            if not sfen:
                return None
            
            try:
                board = shogi.Board(sfen)
            except Exception as e:
                # SFEN パースに失敗した場合は初期盤面から構築
                board = shogi.Board()
            
            # 合法手がない場合は詰み
            if not board.legal_moves:
                return None
            
            # 最初の合法手を返す（簡易実装）
            # 実装時には、評価関数で評価して最良手を選ぶ
            best_move = None
            best_score = -float('inf')
            
            move_count = 0
            for move in board.legal_moves:
                move_count += 1
                if move_count > 50:  # 探索手数を制限
                    break
                
                board.push(move)
                score = self._evaluate_position(board)
                board.pop()
                
                if score > best_score:
                    best_score = score
                    best_move = move
            
            if best_move:
                return self._convert_move_to_php(best_move, board)
            
            return None
        except Exception as e:
            print(f"Error getting best move: {e}", file=sys.stderr)
            return None
    
    def _evaluate_position(self, board: shogi.Board) -> int:
        """盤面を簡易評価"""
        score = 0
        
        # 駒の価値
        piece_values = {
            shogi.PAWN: 1,
            shogi.LANCE: 3,
            shogi.KNIGHT: 3,
            shogi.SILVER: 5,
            shogi.GOLD: 5,
            shogi.BISHOP: 8,
            shogi.ROOK: 10,
            shogi.KING: 0,
        }
        
        # 盤面上の駒を評価
        for square in shogi.SQUARES:
            piece = board.piece_at(square)
            if piece:
                value = piece_values.get(piece.piece_type, 0)
                if piece.color == shogi.BLACK:
                    score += value
                else:
                    score -= value
        
        return score
    
    def _convert_move_to_php(self, move: shogi.Move, board: shogi.Board) -> dict:
        """python-shogi形式の指し手をPHP形式に変換"""
        from_square = move.from_square
        to_square = move.to_square
        
        # 座標を変換（python-shogiは 0-80, PHPは 1-9段 × 1-9筋）
        # python-shogiの座標: 0 = 9一, 8 = 9九, 9 = 8一, ...
        if from_square != 0x00:  # null move でない
            from_file = (from_square % 9) + 1
            from_rank = 9 - (from_square // 9)
        
        to_file = (to_square % 9) + 1
        to_rank = 9 - (to_square // 9)
        
        # ドロップか判定（from_squareが0x00）
        if from_square == 0x00:
            piece_type = move.drop_piece_type
            piece_symbol = self._get_piece_symbol_from_type(piece_type)
            return {
                'is_drop': True,
                'to_file': to_file,
                'to_rank': to_rank,
                'piece_type': piece_symbol,
            }
        else:
            return {
                'is_drop': False,
                'from_file': from_file,
                'from_rank': from_rank,
                'to_file': to_file,
                'to_rank': to_rank,
                'promote': move.promotion,
            }
    
    def _get_piece_symbol_from_type(self, piece_type: int) -> str:
        """python-shogiの駒タイプをPHP形式に変換"""
        mapping = {
            shogi.PAWN: 'fu',
            shogi.LANCE: 'kyosha',
            shogi.KNIGHT: 'keima',
            shogi.SILVER: 'gin',
            shogi.GOLD: 'kin',
            shogi.BISHOP: 'kaku',
            shogi.ROOK: 'hisha',
            shogi.KING: 'ou',
        }
        return mapping.get(piece_type, 'fu')


def main():
    """メイン処理"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No board state provided'}))
        sys.exit(1)
    
    try:
        # PHPからのJSON入力を読み込む
        board_state = json.loads(sys.argv[1])
        depth = int(sys.argv[2]) if len(sys.argv) > 2 else 3
        
        engine = ShogiAIEngine(depth=depth)
        move = engine.get_best_move(board_state)
        
        if move:
            print(json.dumps({'success': True, 'move': move}))
        else:
            print(json.dumps({'success': False, 'error': 'No legal move found'}))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()

