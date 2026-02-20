#!/bin/bash
# フィードバックフォーム包括的テストスイート実行スクリプト

echo ""
echo "========================================="
echo "フィードバックフォーム包括的テスト実行"
echo "========================================="
echo ""

TESTS=(
  "feedback-basic-test.mjs:基本機能"
  "feedback-blind-test.mjs:全盲ユーザー"
  "feedback-low-vision-test.mjs:弱視ユーザー"
  "feedback-color-blind-test.mjs:色覚異常"
  "feedback-parkinsons-test.mjs:パーキンソン病"
  "feedback-peripheral-vision-test.mjs:周辺視野喪失"
)

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

for test_info in "${TESTS[@]}"; do
  IFS=':' read -ra PARTS <<< "$test_info"
  TEST_FILE="${PARTS[0]}"
  TEST_NAME="${PARTS[1]}"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 テスト: $TEST_NAME ($TEST_FILE)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if timeout 120 node "tests/accessibility/$TEST_FILE" 2>&1; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo ""
    echo "✅ $TEST_NAME テスト: 合格"
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo ""
    echo "❌ $TEST_NAME テスト: 失敗"
  fi
  
  echo ""
done

echo ""
echo "========================================="
echo "テスト結果サマリー"
echo "========================================="
echo "合計テスト数: $TOTAL_TESTS"
echo "✅ 合格: $PASSED_TESTS"
echo "❌ 失敗: $FAILED_TESTS"
echo "========================================="
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo "🎉 すべてのテストに合格しました！"
  exit 0
else
  echo "⚠️  一部のテストが失敗しました"
  exit 1
fi
