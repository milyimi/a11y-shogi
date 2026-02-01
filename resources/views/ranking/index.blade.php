@extends('layouts.app')

@section('title', 'ランキング - アクセシブル将棋')

@section('content')
<div class="ranking-page">
    <h2>ランキング</h2>
    
    <section aria-labelledby="difficulty-filter-heading">
        <h3 id="difficulty-filter-heading" class="sr-only">難易度選択</h3>
        <nav aria-label="難易度選択">
            <ul style="display: flex; gap: 16px; list-style: none; padding: 0; margin-bottom: 24px;">
                @foreach($difficulties as $diff => $name)
                    <li>
                        <a href="{{ route('ranking.difficulty', ['difficulty' => $diff]) }}" class="btn {{ $currentDifficulty === $diff ? 'btn-primary' : '' }}">
                            {{ $name }}ランキングへ
                        </a>
                    </li>
                @endforeach
            </ul>
        </nav>
    </section>

    @if(isset($rankingsByDifficulty))
        @foreach($difficulties as $diff => $name)
            @php
                $rankings = $rankingsByDifficulty[$diff] ?? collect();
            @endphp
            <section aria-labelledby="ranking-{{ $diff }}-heading" style="margin-top: 32px;">
                <h3 id="ranking-{{ $diff }}-heading">{{ $name }}ランキング</h3>

                @if($rankings->count() > 0)
                    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                        <caption class="sr-only">{{ $name }}ランキング</caption>
                        <thead>
                            <tr style="border-bottom: 2px solid var(--color-border); background: #F5F5F5;">
                                <th scope="col" style="padding: 12px 8px; text-align: left;">順位</th>
                                <th scope="col" style="padding: 12px 8px; text-align: left;">ニックネーム</th>
                                <th scope="col" style="padding: 12px 8px; text-align: right;">スコア</th>
                                <th scope="col" style="padding: 12px 8px; text-align: right;">手数</th>
                                <th scope="col" style="padding: 12px 8px; text-align: right;">経過時間</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($rankings as $index => $ranking)
                                <tr style="border-bottom: 1px solid #E0E0E0;">
                                    <td style="padding: 12px 8px; font-weight: bold;">
                                        {{ $index + 1 }}位
                                    </td>
                                    <td style="padding: 12px 8px;">{{ $ranking->nickname }}</td>
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
                    <div style="margin-top: 12px;">
                        <a href="{{ route('ranking.difficulty', ['difficulty' => $diff]) }}" class="btn">{{ $name }}の一覧を見る</a>
                    </div>
                @else
                    <p style="margin-top: 16px; padding: 16px; background: #F5F5F5; text-align: center;">
                        {{ $name }}のランキングデータがまだありません。
                    </p>
                @endif
            </section>
        @endforeach
    @elseif(isset($rankings))
        @if($rankings->count() > 0)
            <section aria-labelledby="ranking-list-heading">
                <h3 id="ranking-list-heading">{{ $difficulties[$currentDifficulty] ?? 'ランキング' }}</h3>

                <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
                    <caption class="sr-only">
                        {{ $difficulties[$currentDifficulty] ?? '' }}ランキング
                    </caption>
                    <thead>
                        <tr style="border-bottom: 2px solid var(--color-border); background: #F5F5F5;">
                            <th scope="col" style="padding: 12px 8px; text-align: left;">順位</th>
                            <th scope="col" style="padding: 12px 8px; text-align: left;">ニックネーム</th>
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

                @if($rankings->hasPages())
                    <nav aria-label="ランキングページナビゲーション" style="margin-top: 32px;">
                        {{ $rankings->links() }}
                    </nav>
                @endif
            </section>
        @else
            <p style="margin-top: 24px; padding: 24px; background: #F5F5F5; text-align: center;">
                {{ $difficulties[$currentDifficulty] ?? '' }}のランキングデータがまだありません。
            </p>
        @endif
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
