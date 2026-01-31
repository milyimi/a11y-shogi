@extends('layouts.app')

@section('title', 'ランキング - アクセシブル将棋')

@section('content')
<div class="ranking-page">
    <h2>ランキング</h2>
    
    <section aria-labelledby="difficulty-filter-heading">
        <h3 id="difficulty-filter-heading" class="sr-only">難易度フィルター</h3>
        <nav aria-label="難易度選択">
            <ul style="display: flex; gap: 16px; list-style: none; padding: 0; margin-bottom: 24px;">
                <li>
                    <a href="{{ route('ranking.index') }}" 
                       class="btn {{ !$currentDifficulty ? 'btn-primary' : '' }}">
                        全て
                    </a>
                </li>
                @foreach($difficulties as $diff => $name)
                    <li>
                        <a href="{{ route('ranking.index', ['difficulty' => $diff]) }}" 
                           class="btn {{ $currentDifficulty === $diff ? 'btn-primary' : '' }}">
                            {{ $name }}
                        </a>
                    </li>
                @endforeach
            </ul>
        </nav>
    </section>
    
    @if($rankings->count() > 0)
        <section aria-labelledby="ranking-list-heading">
            <h3 id="ranking-list-heading" class="sr-only">ランキング一覧</h3>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
                <caption class="sr-only">
                    {{ $currentDifficulty ? $difficulties[$currentDifficulty] . 'の' : '全難易度の' }}ランキング
                </caption>
                <thead>
                    <tr style="border-bottom: 2px solid var(--color-border); background: #F5F5F5;">
                        <th scope="col" style="padding: 12px 8px; text-align: left;">順位</th>
                        <th scope="col" style="padding: 12px 8px; text-align: left;">ニックネーム</th>
                        <th scope="col" style="padding: 12px 8px; text-align: left;">難易度</th>
                        <th scope="col" style="padding: 12px 8px; text-align: right;">スコア</th>
                        <th scope="col" style="padding: 12px 8px; text-align: right;">手数</th>
                        <th scope="col" style="padding: 12px 8px; text-align: right;">経過時間</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($rankings as $index => $ranking)
                        <tr style="border-bottom: 1px solid #E0E0E0;">
                            <td style="padding: 12px 8px; font-weight: bold;">
                                {{ $rankings->firstItem() + $index }}位
                            </td>
                            <td style="padding: 12px 8px;">{{ $ranking->nickname }}</td>
                            <td style="padding: 12px 8px;">
                                {{ $difficulties[$ranking->difficulty] ?? $ranking->difficulty }}
                            </td>
                            <td style="padding: 12px 8px; text-align: right; font-weight: bold;">
                                {{ number_format($ranking->score) }}
                            </td>
                            <td style="padding: 12px 8px; text-align: right;">
                                {{ $ranking->total_moves }}手
                            </td>
                            <td style="padding: 12px 8px; text-align: right;">
                                @php
                                    $minutes = floor($ranking->elapsed_seconds / 60);
                                    $seconds = $ranking->elapsed_seconds % 60;
                                @endphp
                                {{ $minutes }}分{{ $seconds }}秒
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
            
            {{-- ページネーション --}}
            @if($rankings->hasPages())
                <nav aria-label="ランキングページナビゲーション" style="margin-top: 32px;">
                    {{ $rankings->links() }}
                </nav>
            @endif
        </section>
    @else
        <p style="margin-top: 24px; padding: 24px; background: #F5F5F5; text-align: center;">
            {{ $currentDifficulty ? $difficulties[$currentDifficulty] . 'の' : '' }}ランキングデータがまだありません。
        </p>
    @endif
    
    <section style="margin-top: 48px;" aria-labelledby="score-calc-heading">
        <h3 id="score-calc-heading">スコア計算方法</h3>
        <p>
            スコア = 10,000 - (手数 × 50) - (経過秒数 ÷ 10)<br>
            <small style="color: #666;">※少ない手数と短い時間でクリアするほど高スコアになります</small>
        </p>
    </section>
    
    <div style="margin-top: 32px;">
        <a href="{{ route('home') }}" class="btn">ホームに戻る</a>
    </div>
</div>
@endsection
