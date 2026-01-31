<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // ゲームセッションテーブル
        Schema::create('game_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->unique();
            
            // ゲーム状態
            $table->enum('status', ['in_progress', 'mate', 'draw', 'resigned'])->default('in_progress');
            $table->enum('winner', ['human', 'ai'])->nullable();
            $table->string('winner_type', 50)->nullable()->comment('勝利方法: checkmate, resignation, draw');
            
            // ゲーム設定
            $table->enum('difficulty', ['easy', 'medium', 'hard']);
            $table->enum('human_color', ['sente', 'gote'])->default('sente')->comment('人間が先手か後手か');
            
            // 局面データ
            $table->longText('current_board_position')->comment('現在の盤面（JSON）');
            $table->json('move_history')->default('[]')->comment('指し手履歴の配列');
            $table->integer('last_move_index')->default(0)->comment('現在の手数');
            
            // ゲーム情報
            $table->integer('total_moves')->default(0);
            $table->integer('human_moves_count')->default(0);
            $table->integer('ai_moves_count')->default(0);
            
            // タイムスタンプ
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            
            // メタデータ
            $table->integer('elapsed_seconds')->default(0)->comment('対局時間');
            $table->text('browser_user_agent')->nullable();
            $table->string('ip_address', 45)->nullable();
            
            $table->timestamps();
            
            // インデックス
            $table->index('session_id');
            $table->index('status');
            $table->index('created_at');
            $table->index('difficulty');
        });

        // 指し手履歴テーブル
        Schema::create('game_moves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_session_id')->constrained()->onDelete('cascade');
            
            // 指し手情報
            $table->integer('move_number')->comment('手数（1, 2, 3...）');
            $table->string('from_position', 10)->comment('移動前 例: "7g"');
            $table->string('to_position', 10)->comment('移動先 例: "7f"');
            $table->string('piece_type', 20)->comment('駒種 例: "fu", "kin", "hisha"');
            $table->enum('piece_color', ['sente', 'gote']);
            
            // 指し手の詳細
            $table->boolean('is_capture')->default(false)->comment('取った駒があるか');
            $table->string('captured_piece_type', 20)->nullable()->comment('取った駒の種類');
            $table->boolean('is_promotion')->default(false)->comment('成ったか');
            $table->boolean('is_check')->default(false)->comment('王手をかけたか');
            
            // エンジン情報
            $table->enum('move_by', ['human', 'ai']);
            $table->integer('ai_evaluation')->nullable()->comment('AI評価値（センチポーン）');
            $table->integer('ai_depth')->nullable()->comment('AI探索深さ');
            
            // タイムスタンプ
            $table->integer('move_time_ms')->nullable()->comment('指すのにかかった時間（ミリ秒）');
            $table->timestamps();
            
            // インデックス
            $table->index('game_session_id');
            $table->index('move_number');
            $table->unique(['game_session_id', 'move_number']);
        });

        // 局面履歴テーブル（オプション）
        Schema::create('board_states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_session_id')->constrained()->onDelete('cascade');
            $table->integer('move_number');
            
            // 盤面データ
            $table->longText('board_position')->comment('盤面状態（JSON形式）');
            $table->json('captured_pieces_sente')->default('[]')->comment('先手が取った駒');
            $table->json('captured_pieces_gote')->default('[]')->comment('後手が取った駒');
            
            // ゲーム状態
            $table->boolean('is_check')->default(false);
            $table->boolean('is_checkmate')->default(false);
            $table->boolean('is_stalemate')->default(false);
            
            $table->timestamps();
            
            // インデックス
            $table->index('game_session_id');
            $table->unique(['game_session_id', 'move_number']);
        });

        // ランキングテーブル
        Schema::create('rankings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_session_id')->constrained()->onDelete('cascade');
            
            // プレイヤー情報
            $table->string('nickname', 15)->comment('ニックネーム（3～15文字）');
            
            // ゲーム情報
            $table->enum('difficulty', ['easy', 'medium', 'hard']);
            $table->integer('total_moves')->comment('総手数');
            $table->integer('elapsed_seconds')->comment('対局時間（秒）');
            
            // スコア計算用
            $table->integer('score')->comment('スコア（手数と時間から算出）');
            
            $table->timestamps();
            
            // インデックス
            $table->index('difficulty');
            $table->index(['difficulty', 'score'], 'idx_difficulty_score');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rankings');
        Schema::dropIfExists('board_states');
        Schema::dropIfExists('game_moves');
        Schema::dropIfExists('game_sessions');
    }
};
