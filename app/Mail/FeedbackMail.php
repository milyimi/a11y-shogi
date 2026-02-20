<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class FeedbackMail extends Mailable
{
    use Queueable, SerializesModels;

    protected $feedbackType;
    protected $feedbackName;
    protected $feedbackEmail;
    protected $feedbackDisability;
    protected $feedbackBody;
    protected $feedbackUserAgent;
    protected $feedbackSubmittedAt;

    public function __construct(
        string $type,
        string $name,
        string $email,
        string $disability,
        string $body,
        string $user_agent,
        string $submitted_at,
    ) {
        $this->feedbackType = $type;
        $this->feedbackName = $name;
        $this->feedbackEmail = $email;
        $this->feedbackDisability = $disability;
        $this->feedbackBody = $body;
        $this->feedbackUserAgent = $user_agent;
        $this->feedbackSubmittedAt = $submitted_at;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: config('mail.from.address'),
            subject: '[a11y-shogi] 新しいフィードバック: ' . now()->format('Y-m-d H:i'),
        );
    }

    public function content(): Content
    {
        $typeLabel = match($this->feedbackType) {
            'general' => '一般的なご意見・ご感想',
            'bug' => '不具合報告',
            'feature_request' => '機能リクエスト',
            default => $this->feedbackType,
        };

        return new Content(
            text: 'mail.feedback_plain',
            with: [
                'type' => $typeLabel,
                'name' => $this->feedbackName,
                'email' => $this->feedbackEmail,
                'disability' => $this->feedbackDisability,
                'body' => $this->feedbackBody,
                'user_agent' => $this->feedbackUserAgent,
                'submitted_at' => $this->feedbackSubmittedAt,
            ],
        );
    }
}



