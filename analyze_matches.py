#!/usr/bin/env python3
"""
AI対局結果分析ツール
storage/app/private/ai_matches/*.json を読み込んで統計分析を実行
"""

import json
import glob
import os
from collections import Counter
from pathlib import Path

def analyze_match_logs():
    log_dir = Path('/var/www/html/a11y-shogi/storage/app/private/ai_matches')
    json_files = list(log_dir.glob('*.json'))
    
    if not json_files:
        print("ログファイルが見つかりません")
        return
    
    print(f"=== AI対局結果分析 ===")
    print(f"ログファイル数: {len(json_files)}\n")
    
    all_stats = {
        'total_games': 0,
        'php_wins': 0,
        'external_wins': 0,
        'draws': 0,
        'end_reasons': Counter(),
        'move_counts': [],
        'configs': []
    }
    
    for json_file in sorted(json_files):
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        config = data.get('config', {})
        results = data.get('results', {})
        games = results.get('games', [])
        
        print(f"--- {json_file.name} ---")
        print(f"  ゲーム数: {len(games)}")
        print(f"  PHP depth: {config.get('php_depth')}, External: {config.get('external_type')} depth={config.get('external_depth')}")
        
        php_wins = sum(1 for g in games if g.get('winner') == 'PHP')
        external_wins = sum(1 for g in games if g.get('winner') == 'External')
        draws = sum(1 for g in games if g.get('winner') == 'draw')
        
        print(f"  PHP勝: {php_wins}, External勝: {external_wins}, 引き分け: {draws}")
        
        avg_moves = sum(g.get('moves', 0) for g in games) / len(games) if games else 0
        print(f"  平均手数: {avg_moves:.1f}")
        
        reasons = Counter(g.get('reason', 'unknown') for g in games)
        print(f"  終局理由: {dict(reasons)}\n")
        
        all_stats['total_games'] += len(games)
        all_stats['php_wins'] += php_wins
        all_stats['external_wins'] += external_wins
        all_stats['draws'] += draws
        all_stats['end_reasons'].update(reasons)
        all_stats['move_counts'].extend([g.get('moves', 0) for g in games])
        all_stats['configs'].append({
            'file': json_file.name,
            'php_depth': config.get('php_depth'),
            'external_type': config.get('external_type'),
            'external_depth': config.get('external_depth'),
            'games': len(games),
            'php_wins': php_wins,
            'external_wins': external_wins
        })
    
    print("\n=== 全体統計 ===")
    print(f"総ゲーム数: {all_stats['total_games']}")
    print(f"PHP勝: {all_stats['php_wins']} ({all_stats['php_wins']/max(all_stats['total_games'],1)*100:.1f}%)")
    print(f"External勝: {all_stats['external_wins']} ({all_stats['external_wins']/max(all_stats['total_games'],1)*100:.1f}%)")
    print(f"引き分け: {all_stats['draws']} ({all_stats['draws']/max(all_stats['total_games'],1)*100:.1f}%)")
    
    if all_stats['move_counts']:
        avg_all_moves = sum(all_stats['move_counts']) / len(all_stats['move_counts'])
        max_moves = max(all_stats['move_counts'])
        min_moves = min(all_stats['move_counts'])
        print(f"\n平均手数: {avg_all_moves:.1f} (最小: {min_moves}, 最大: {max_moves})")
    
    print(f"\n終局理由別統計:")
    for reason, count in all_stats['end_reasons'].most_common():
        print(f"  {reason}: {count} ({count/max(all_stats['total_games'],1)*100:.1f}%)")
    
    print(f"\n=== 設定別勝率 ===")
    for cfg in all_stats['configs']:
        total = cfg['games']
        if total > 0:
            php_rate = cfg['php_wins'] / total * 100
            ext_rate = cfg['external_wins'] / total * 100
            print(f"{cfg['file'][:30]}: PHP {php_rate:.0f}% vs {cfg['external_type']} {ext_rate:.0f}%")

if __name__ == '__main__':
    analyze_match_logs()
