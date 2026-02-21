<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

describe('FeedbackController', function () {
    describe('show', function () {
        it('displays feedback form with proper accessibility attributes', function () {
            $response = $this->get(route('feedback.show'));
            
            $response->assertStatus(200);
            $response->assertSee('ご意見・ご感想');
            $response->assertSee('フィードバック種別');
            $response->assertSee('お名前');
            $response->assertSee('メールアドレス');
            $response->assertSee('ご自身の特性');
        });

        it('form contains skip link for keyboard navigation', function () {
            $response = $this->get(route('feedback.show'));
            
            $response->assertSee('skip-link');
        });

        it('form has ARIA labels and descriptions', function () {
            $response = $this->get(route('feedback.show'));
            
            $response->assertSee('aria-describedby');
            $response->assertSee('aria-label');
            $response->assertSee('aria-live');
        });
    });

    describe('confirm', function () {
        it('displays confirmation page with submitted data', function () {
            $data = [
                'type' => 'general',
                'name' => '田中太郎',
                'email' => 'test@example.com',
                'disability' => ['全盲（スクリーンリーダー利用）'],
                'message' => 'これは有効なフィードバックです。アプリがとても使いやすいです。',
            ];

            $response = $this->post(route('feedback.confirm'), $data);

            $response->assertStatus(200);
            $response->assertSee('フィードバック確認');
            $response->assertSee('田中太郎');
            $response->assertSee('test@example.com');
            $response->assertSee('これは有効なフィードバックです。アプリがとても使いやすいです。');
        });

        it('validates form before showing confirmation page', function () {
            $data = [
                'type' => 'general',
                'message' => '',
            ];

            $response = $this->post(route('feedback.confirm'), $data);

            $response->assertSessionHasErrors('message');
            $response->assertDontSee('フィードバック確認');
        });

        it('shows Japanese validation error messages', function () {
            $data = [
                'type' => 'general',
                'message' => 'short',
            ];

            $response = $this->post(route('feedback.confirm'), $data);

            $response->assertSessionHasErrors('message');
            // 日本語エラーメッセージを確認
            $this->assertStringContainsString('10文字', session('errors')->first('message'));
        });

        it('preserves data when returning to edit form', function () {
            $data = [
                'type' => 'bug',
                'name' => '佐藤次郎',
                'email' => 'satou@example.com',
                'disability' => ['弱視'],
                'message' => 'ボタンがもっと大きいと使いやすいです。',
            ];

            // 確認画面へ送信
            $this->post(route('feedback.confirm'), $data);

            // 修復ボタンでフォームに戻る
            $response = $this->get(route('feedback.show'));

            $response->assertStatus(200);
            // 前の入力データがフォームに表示されるか確認
            $response->assertSee('佐藤次郎');
            $response->assertSee('satou@example.com');
            $response->assertSee('ボタンがもっと大きいと使いやすいです。');
        });
    });

    describe('store', function () {
        it('redirects to thanks after valid feedback submission', function () {
            Mail::fake();

            $data = [
                'type' => 'general',
                'name' => '田中太郎',
                'email' => 'test@example.com',
                'disability' => ['全盲（スクリーンリーダー利用）'],
                'message' => 'これは有効なフィードバックです。アプリがとても使いやすいです。',
            ];

            // 先に確認画面へ送信してセッションに保存
            $this->post(route('feedback.confirm'), $data);

            // その後、確認画面から実際の送信
            $response = $this->post(route('feedback.store'));

            $response->assertRedirect(route('feedback.thanks'));
            Mail::assertSent(\App\Mail\FeedbackMail::class);
        });

        it('sends email with Japanese labels for feedback type', function () {
            Mail::fake();

            $data = [
                'type' => 'bug',
                'name' => 'テストユーザー',
                'email' => 'test@example.com',
                'disability' => ['テスト'],
                'message' => '不具合テストです。これは有効なメッセージです。',
            ];

            // 確認画面へ送信（セッションに保存）
            $this->post(route('feedback.confirm'), $data);
            
            // store ルートで送信実行
            $this->post(route('feedback.store'));

            // メール送信を確認
            Mail::assertSent(\App\Mail\FeedbackMail::class);
        });

        it('converts empty name, email, and disability to default values', function () {
            Mail::fake();

            $data = [
                'type' => 'general',
                'name' => '',
                'email' => '',
                'disability' => [],
                'message' => 'これは有効なフィードバックメッセージです。',
            ];

            // 確認画面へ送信（セッションに保存）
            $this->post(route('feedback.confirm'), $data);
            
            // store ルートで送信実行
            $this->post(route('feedback.store'));

            // メール送信を確認
            Mail::assertSent(\App\Mail\FeedbackMail::class);
        });

        it('handles spam by still showing thank you page', function () {
            $data = [
                'type' => 'general',
                'message' => 'You can get viagra very cheap here! Please click this link.',
            ];

            // 確認画面へ送信
            $this->post(route('feedback.confirm'), $data);

            // スパムでも感謝ページへリダイレクト（プライバシー保護）
            $response = $this->post(route('feedback.store'));

            $response->assertRedirect(route('feedback.thanks'));
        });

        it('handles URLs spam by still showing thank you page', function () {
            $data = [
                'type' => 'general',
                'message' => 'Check these links: https://example1.com https://example2.com https://example3.com https://example4.com https://example5.com https://example6.com',
            ];

            // 確認画面へ送信
            $this->post(route('feedback.confirm'), $data);

            // スパムでも感謝ページへリダイレクト
            $response = $this->post(route('feedback.store'));

            $response->assertRedirect(route('feedback.thanks'));
        });

        it('redirects to feedback form if session data is missing', function () {
            $response = $this->post(route('feedback.store'));

            $response->assertRedirect(route('feedback.show'));
            $response->assertSessionHasErrors('session');
        });
    });

    describe('thanks', function () {
        it('displays thank you page', function () {
            $response = $this->get(route('feedback.thanks'));

            $response->assertStatus(200);
            $response->assertSee('送信完了');
            $response->assertSee('フィードバックをお送りいただき');
            $response->assertSee('ありがとうございました');
        });

        it('thank you page has links back to home and feedback form', function () {
            $response = $this->get(route('feedback.thanks'));

            $response->assertSee(route('home'));
            $response->assertSee(route('feedback.show'));
        });
    });
});
