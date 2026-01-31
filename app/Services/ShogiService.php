<?php

namespace App\Services;

class ShogiService
{
    /**
     * 初期盤面を取得（標準的な将棋の配置）
     */
    public function getInitialBoard(): array
    {
        return [
            'format' => 'shogi_standard',
            'version' => '1.0',
            'board' => [
                // 9段目（後手側最奥）
                '9' => [
                    '1' => ['type' => 'kyosha', 'color' => 'gote'],
                    '2' => ['type' => 'keima', 'color' => 'gote'],
                    '3' => ['type' => 'gin', 'color' => 'gote'],
                    '4' => ['type' => 'kin', 'color' => 'gote'],
                    '5' => ['type' => 'gyoku', 'color' => 'gote'],
                    '6' => ['type' => 'kin', 'color' => 'gote'],
                    '7' => ['type' => 'gin', 'color' => 'gote'],
                    '8' => ['type' => 'keima', 'color' => 'gote'],
                    '9' => ['type' => 'kyosha', 'color' => 'gote'],
                ],
                // 8段目
                '8' => [
                    '1' => null,
                    '2' => ['type' => 'hisha', 'color' => 'gote'],
                    '3' => null,
                    '4' => null,
                    '5' => null,
                    '6' => null,
                    '7' => null,
                    '8' => ['type' => 'kaku', 'color' => 'gote'],
                    '9' => null,
                ],
                // 7段目（後手の歩）
                '7' => [
                    '1' => ['type' => 'fu', 'color' => 'gote'],
                    '2' => ['type' => 'fu', 'color' => 'gote'],
                    '3' => ['type' => 'fu', 'color' => 'gote'],
                    '4' => ['type' => 'fu', 'color' => 'gote'],
                    '5' => ['type' => 'fu', 'color' => 'gote'],
                    '6' => ['type' => 'fu', 'color' => 'gote'],
                    '7' => ['type' => 'fu', 'color' => 'gote'],
                    '8' => ['type' => 'fu', 'color' => 'gote'],
                    '9' => ['type' => 'fu', 'color' => 'gote'],
                ],
                // 6段目（空）
                '6' => array_fill(1, 9, null),
                // 5段目（空）
                '5' => array_fill(1, 9, null),
                // 4段目（空）
                '4' => array_fill(1, 9, null),
                // 3段目（先手の歩）
                '3' => [
                    '1' => ['type' => 'fu', 'color' => 'sente'],
                    '2' => ['type' => 'fu', 'color' => 'sente'],
                    '3' => ['type' => 'fu', 'color' => 'sente'],
                    '4' => ['type' => 'fu', 'color' => 'sente'],
                    '5' => ['type' => 'fu', 'color' => 'sente'],
                    '6' => ['type' => 'fu', 'color' => 'sente'],
                    '7' => ['type' => 'fu', 'color' => 'sente'],
                    '8' => ['type' => 'fu', 'color' => 'sente'],
                    '9' => ['type' => 'fu', 'color' => 'sente'],
                ],
                // 2段目
                '2' => [
                    '1' => null,
                    '2' => ['type' => 'kaku', 'color' => 'sente'],
                    '3' => null,
                    '4' => null,
                    '5' => null,
                    '6' => null,
                    '7' => null,
                    '8' => ['type' => 'hisha', 'color' => 'sente'],
                    '9' => null,
                ],
                // 1段目（先手側最奥）
                '1' => [
                    '1' => ['type' => 'kyosha', 'color' => 'sente'],
                    '2' => ['type' => 'keima', 'color' => 'sente'],
                    '3' => ['type' => 'gin', 'color' => 'sente'],
                    '4' => ['type' => 'kin', 'color' => 'sente'],
                    '5' => ['type' => 'gyoku', 'color' => 'sente'],
                    '6' => ['type' => 'kin', 'color' => 'sente'],
                    '7' => ['type' => 'gin', 'color' => 'sente'],
                    '8' => ['type' => 'keima', 'color' => 'sente'],
                    '9' => ['type' => 'kyosha', 'color' => 'sente'],
                ],
            ],
            'hand' => [
                'sente' => [],
                'gote' => [],
            ],
            'turn' => 'sente',
        ];
    }

    /**
     * 駒の日本語名を取得
     */
    public function getPieceName(string $type): string
    {
        return match($type) {
            'fu' => '歩',
            'kyosha' => '香',
            'keima' => '桂',
            'gin' => '銀',
            'kin' => '金',
            'kaku' => '角',
            'hisha' => '飛',
            'gyoku' => '玉',
            'ou' => '王',
            default => $type,
        };
    }
}
