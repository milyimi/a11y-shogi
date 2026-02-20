<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\FeedbackMail;


class FeedbackController extends Controller
{
    /**
     * フィードバックフォーム表示ページ
     * セッションにデータがあれば、それを渡す（修正時のデータ復元用）
     */
    public function show(Request $request)
    {
        $feedback_data = $request->session()->get('feedback_data');
        
        return view('feedback.form', [
            'feedback_data' => $feedback_data,
        ]);
    }

    /**
     * フィードバック確認画面表示処理
     * フォームから送信されたデータをバリデーションして確認画面を表示
     */
    public function confirm(Request $request)
    {
        // バリデーション (確認画面表示前)
        $validated = $request->validate(
            [
                'type' => 'required|in:general,bug,feature_request',
                'name' => 'nullable|string|max:100|regex:/^[ぁ-ん一-龠々〆〤ァ-ヴー\-a-zA-Z0-9_\s]+$/',
                'email' => 'nullable|email|max:255',
                'disability' => 'nullable|string|max:500',
                'message' => 'required|string|min:10|max:2000',
            ],
            [
                'type.required' => 'フィードバック種別を選択してください。',
                'type.in' => 'フィードバック種別が無効です。',
                'name.regex' => 'お名前は日本語、英数字、ハイフン、アンダースコア、空白のみ使用できます。',
                'name.max' => 'お名前は100文字以内でお願いします。',
                'email.email' => 'メールアドレスの形式が無効です。',
                'email.max' => 'メールアドレスは255文字以内でお願いします。',
                'disability.max' => 'ご自身の特性は500文字以内でお願いします。',
                'message.required' => 'ご意見・ご感想を入力してください。',
                'message.min' => 'ご意見・ご感想は10文字以上でお願いします。',
                'message.max' => 'ご意見・ご感想は2000文字以内でお願いします。',
            ]
        );

        // セッションに値を保存（確認画面表示用）
        $request->session()->put('feedback_data', $validated);

        return view('feedback.confirm', [
            'data' => $validated,
        ]);
    }

    /**
     * フィードバック送信処理
     * プライバシーへの配慮：メール送信のみ、DBに保存しない
     */
    public function store(Request $request)
    {
        // Rate Limiting: 同一IPから1時間に5件までに制限
        $ipKey = 'feedback:' . Hash::make($request->ip());
        if (RateLimiter::tooManyAttempts($ipKey, 5)) {
            return back()
                ->withErrors(['submitted' => 'フィードバックは1時間以内に5件までに制限しています。後でお試しください。'])
                ->withInput();
        }

        RateLimiter::hit($ipKey, 3600); // 1時間の有効期限

        // セッションから保存されたデータを取得
        $validated = $request->session()->get('feedback_data');

        if (!$validated) {
            // セッションがない場合はフォームに戻す
            return redirect()->route('feedback.show')
                ->withErrors(['session' => 'セッションが無効です。もう一度入力してください。']);
        }

        // スパム検出: メッセージにスパムキーワード含まれていないか
        $spamKeywords = ['viagra', 'casino', 'lottery', 'バイアグラ', 'カジノ'];
        $isSpam = $this->detectSpam($validated['message'], $spamKeywords);

        // スパムの場合は処理を中止
        if ($isSpam) {
            return redirect()->route('feedback.thanks')
                ->with('success', 'フィードバックをお送りいただき、ありがとうございます。');
        }

        // 管理者にメール送信
        try {
            Mail::to(config('app.admin_email', 'admin@example.com'))
                ->send(new FeedbackMail(
                    $validated['type'],
                    $validated['name'] ?? '未記入',
                    $validated['email'] ?? '未記入',
                    $validated['disability'] ?? '未記入',
                    $validated['message'],
                    $request->userAgent(),
                    now()->format('Y-m-d H:i:s')
                ));
        } catch (\Exception $e) {
            // メール送信失敗時もユーザーには感謝ページを表示
            // ログには記録される
            \Log::error('Feedback email sending failed: ' . $e->getMessage());
        }

        // セッションからフィードバックデータを削除
        $request->session()->forget('feedback_data');

        return redirect()->route('feedback.thanks')
            ->with('success', 'フィードバックをお送りいただき、ありがとうございます。');
    }

    /**
     * 送信完了ページ
     */
    public function thanks()
    {
        return view('feedback.thanks');
    }

    /**
     * スパム検出ロジック
     */
    private function detectSpam(string $message, array $keywords): bool
    {
        $lowerMessage = mb_strtolower($message);
        
        foreach ($keywords as $keyword) {
            if (strpos($lowerMessage, mb_strtolower($keyword)) !== false) {
                return true;
            }
        }

        // URLが5個以上含まれている場合はスパム判定
        $urlCount = substr_count($message, 'http://') + substr_count($message, 'https://');
        if ($urlCount >= 5) {
            return true;
        }

        return false;
    }
}
